import "server-only";

const controllers = new Map<string, AbortController>();

export function registerRefresh(boardId: string, controller: AbortController) {
  controllers.set(boardId, controller);
  return () => {
    if (controllers.get(boardId) === controller) controllers.delete(boardId);
  };
}

export function abortBoardRefresh(boardId: string) {
  controllers.get(boardId)?.abort();
}
