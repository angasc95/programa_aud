export const APP_SHELL_CONTAINER_CLASS =
  'max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12';

export const APP_HEADER_CONTAINER_CLASS =
  'max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-12';

export function getUniversalCardGridClass(isSidebarOpen: boolean): string {
  return isSidebarOpen
    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 min-[1680px]:grid-cols-4 gap-4'
    : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4';
}
