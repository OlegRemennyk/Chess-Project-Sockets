


// import bishop from '/static/images/bishop-white.png'
// import whitepawn from '/static/images/pawn-white.png'
// import blackpawn from '/static/images/pawn-black.png'
// import rook from '/static/images/rook-white.png'
// import queen from '/static/images/queen-white.png'
// import king from '/static/images/king-white.png'
// import blackknight from '/static/images/knight-black.png'
// import whiteknight from '/static/images/knight-white.png'
// import blackbishop from '/static/images/pawn-black.png'


// export const nigger = { 
//   whitepawn,
//   blackpawn,
//   bishop,
//   rook,
//   queen,
//   king,
//   knight

// }


export enum PieceType {
    //after i changed it to a class i can change the enum from defaultively present a number as a type
    //i code it to use a string.
    PAWN = "pawn",
    BISHOP = "bishop",
    KNIGHT = "knight",
    ROOK = "rook",
    QUEEN = "queen",
    KING = "king",
  }
  export enum TeamType {
    OPPONENT = "black",
    OUR = "white",
  }