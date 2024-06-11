import {useEffect, useRef, useState} from "react";
import { initialBoard } from "../../Constants";
import { Piece, Position } from "../../models";
import { Board } from "../../models/Board";
import { Pawn } from "../../models/Pawn";
// import { bishopMove,  kingMove, knightMove, pawnMove, queenMove, rookMove } from "../../referee/rules";
import { PieceType, TeamType } from "../../Types";
import Chessboard from "../../Chessboard";

const ws = new WebSocket('wss://chess-sockets-1lb7.onrender.com');

export default function Referee() {
    const [board, setBoard] = useState<Board>(initialBoard.clone());
    const [promotionPawn, setPromotionPawn] = useState<Piece>();
    const modalRef = useRef<HTMLDivElement>(null);
    const checkmateModalRef = useRef<HTMLDivElement>(null);
    const [myTeamType, setMyTeamType] = useState<TeamType>(TeamType.OUR);

    useEffect(() => {
        const saveBoard = localStorage.getItem("board");
        if (saveBoard) {
            const savedBoardParsed = JSON.parse(saveBoard);
            

            const clonedBoard = initialBoard.clone();
            clonedBoard.pieces = savedBoardParsed.pieces.map((p: Piece) => {
                return new Piece(new Position(p.position.x, p.position.y), p.type, p.team, p.hasMoved);
            });
            clonedBoard.totalTurns = savedBoardParsed.totalTurns;
            clonedBoard.calculateAllMoves();
            setBoard(clonedBoard);
        }
    }, []);

    useEffect(() => {
        ws.onopen = () => {
            console.log("Connected to server");
        }
        // send the board to the server
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.type === "teamType") {
                if (data.currentTeam % 2 === 0) {
                    setMyTeamType(TeamType.OPPONENT)
                }else {
                    setMyTeamType(TeamType.OUR)
                }
            }else
            if (data.type === "promotion") {
                const pieceType = data.pieceType
                const previousPiece = data.previousPiece
                const piece = board.pieces.find(
                    (p) =>
                        p.position.x === previousPiece.position.x &&
                        p.position.y === previousPiece.position.y
                );
                if (piece) {
                    setBoard(() => {
                        const clonedBoard = board.clone();
                        clonedBoard.pieces = clonedBoard.pieces.reduce((results, p) => {
                            if (p.samePiecePosition(piece)) {
                                results.push(new Piece(p.position.clone(), pieceType,
                                    p.team, true));
                            } else {
                                results.push(p);
                            }
                            return results;
                        }, [] as Piece[]);
                        clonedBoard.calculateAllMoves();
                        return clonedBoard;
                    })

                }


            }
            else if (data.type === "restart") {
                checkmateModalRef.current?.classList.remove("hidden");
                setBoard(initialBoard.clone());
                localStorage.removeItem("board");

            }
            else{
                console.log(data)
                const playedPiece = data.playedPiece
                const destination = data.destination
                const enPassantMove = data.enPassantMove


                const piece = board.pieces.find(
                    (p) =>
                        p.position.x === playedPiece.position.x &&
                        p.position.y === playedPiece.position.y
                );
                if (piece) {
                    playOponentMove(piece, destination,enPassantMove);
                }

            }


        }
    ws.onclose = () => {
            console.log("Disconnected from server");
        }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [board]);

    function playOponentMove(playedPiece: Piece, destination: Position, isEnpassant: boolean) {
        setBoard(() => {
            const clonedBoard = board.clone();
            clonedBoard.totalTurns += 1;
            clonedBoard.playMove(isEnpassant, true, playedPiece, destination);
            return clonedBoard;
        })

    }
    function playMove(playedPiece: Piece, destination: Position): boolean {
        // If the playing piece doesn't have any moves return
        if (playedPiece.possibleMoves === undefined) return false;

        if (playedPiece.team !== myTeamType) return false;

        let myTurn = 0;
        if (myTeamType === TeamType.OUR) {
            myTurn = 1;
        }
        else {
            myTurn = 0;
        }
        if (board.totalTurns % 2 !== myTurn) return false;

        // // Prevent the inactive team from playing
        // if (playedPiece.team === TeamType.OUR
        //     && board.totalTurns % 2 !== 1) return false;
        // if (playedPiece.team === TeamType.OPPONENT
        //     && board.totalTurns % 2 !== 0) return false;

        let playedMoveIsValid = false;

        const validMove = playedPiece.possibleMoves?.some(m => m.samePosition(destination));

        if (!validMove) return false;

        const enPassantMove = isEnPassantMove(
            playedPiece.position,
            destination,
            playedPiece.type,
            playedPiece.team
        );

        // playMove modifies the board thus we
        // need to call setBoard
        setBoard(() => {
            const clonedBoard = board.clone();
            clonedBoard.totalTurns += 1;
            // Playing the move
            playedMoveIsValid = clonedBoard.playMove(enPassantMove,
                validMove, playedPiece,
                destination);

            if(clonedBoard.winningTeam !== undefined) {
                checkmateModalRef.current?.classList.remove("hidden");
                console.log("WINNING TEAM: " + clonedBoard.winningTeam)
                ws.send(JSON.stringify({type:"restart"}));
            }
           
            // here we should update the socket to let the opponent know
            // that we made a move
            ws.send(JSON.stringify({playedPiece, destination,enPassantMove}));


            return clonedBoard;
        })
        localStorage.setItem("board", JSON.stringify(board));

        // This is for promoting a pawn
        const promotionRow = (playedPiece.team === TeamType.OUR) ? 7 : 0;

        if (destination.y === promotionRow && playedPiece.isPawn) {
            modalRef.current?.classList.remove("hidden");
            setPromotionPawn(() => {
                const clonedPlayedPiece = playedPiece.clone();
                clonedPlayedPiece.position = destination.clone();
                return clonedPlayedPiece;
            });
        }

        return playedMoveIsValid;
    }

    function isEnPassantMove(
        initialPosition: Position,
        desiredPosition: Position,
        type: PieceType,
        team: TeamType
    ) {
        const pawnDirection = team === TeamType.OUR ? 1 : -1;

        if (type === PieceType.PAWN) {
            if (
                (desiredPosition.x - initialPosition.x === -1 ||
                    desiredPosition.x - initialPosition.x === 1) &&
                desiredPosition.y - initialPosition.y === pawnDirection
            ) {
                const piece = board.pieces.find(
                    (p) =>
                        p.position.x === desiredPosition.x &&
                        p.position.y === desiredPosition.y - pawnDirection &&
                        p.isPawn &&
                        (p as Pawn).enPassant
                );
                if (piece) {
                    return true;
                }
            }
        }

        return false;
    }

    

    function promotePawn(pieceType: PieceType) {
        if (promotionPawn === undefined) {
            return;
        }

        setBoard(() => {
            const clonedBoard = board.clone();
            clonedBoard.pieces = clonedBoard.pieces.reduce((results, piece) => {
                if (piece.samePiecePosition(promotionPawn)) {
                    results.push(new Piece(piece.position.clone(), pieceType,
                        piece.team, true));
                } else {
                    results.push(piece);
                }
                return results;
            }, [] as Piece[]);

            clonedBoard.calculateAllMoves();
            ws.send(JSON.stringify({type:"promotion",pieceType: pieceType,previousPiece: promotionPawn}));

            return clonedBoard;
        })

        modalRef.current?.classList.add("hidden");
    }

    function promotionTeamType() {
        return (promotionPawn?.team === TeamType.OUR) ? "white" : "black";
    }
    
    function restartGame() {
        checkmateModalRef.current?.classList.add("hidden");
        setBoard(initialBoard.clone());
        localStorage.removeItem("board");
        board.restartGame = true;
            
        
    }
    
    

    return (
        <>
           
            <p style={{ color: "black", fontSize: "24px", textAlign: "center" }}>Total turns: {board.totalTurns}</p>

            <p style={{ color: "black", fontSize: "24px", textAlign: "center" }}>Team: {myTeamType}</p>
            <div className="btn-reset-div">
            <button className="resetBtn" onClick={restartGame}>Play again</button>
            </div>
            <div className="modal hidden" ref={modalRef}>
                <div className="modal-body">

                    <img onClick={() => promotePawn(PieceType.ROOK)} src={`/static/images/rook-${promotionTeamType()}.png`} />
                    <img onClick={() => promotePawn(PieceType.BISHOP)} src={`/static/images/bishop-${promotionTeamType()}.png`} />
                    <img onClick={() => promotePawn(PieceType.KNIGHT)} src={`/static/images/knight-${promotionTeamType()}.png`} />
                    <img onClick={() => promotePawn(PieceType.QUEEN)} src={`/static/images/queen-${promotionTeamType()}.png`} />
                </div>
            </div>
           
            <div className="modal hidden" ref={checkmateModalRef}>
                <div className="modal-body">
                    <div className="checkmate-body">
                        <span>The winning team is {board.winningTeam === TeamType.OUR ? "white" : "black"}!</span>
                        <button onClick={restartGame}>Play again</button>
                    </div>
                </div>
            </div>
            <Chessboard playMove={playMove}
                pieces={board.pieces} />
        </>
    )
}