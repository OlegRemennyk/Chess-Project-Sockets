import { Piece } from "./models";
import "./styling/Tile.css";
import {  PieceType, TeamType } from "./Types";

interface Props {
  image?: string;
  number: number;
  highlight: boolean;
  type?: PieceType
  color?:TeamType
}

export default function Tile({ number, image, highlight, type , color }: Props) {
  const className: string = ["tile",
    number % 2 === 0 && "black-tile",
    number % 2 !== 0 && "white-tile",
    highlight && "tile-highlight",
    image && "chess-piece-tile"].filter(Boolean).join(' ');
   
  return (
    <div className={className}>
      {image && <div style={{ backgroundImage: `url(${image})` }}
                     className="chess-piece"></div>} 
    </div>
  );
}