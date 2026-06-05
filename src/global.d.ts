declare module '*/context/GameContext' {
  export function useGame(): any;
  export const GameContext: any;
  export function GameProvider(props: any): any;
}

declare module '*/hooks/useToast' {
  export function useToast(): any;
  export const ToastContext: any;
  export function ToastProvider(props: any): any;
}

declare module '*/board/usePiecePositions' {
  export function usePiecePositions(fen: string): any[];
}
