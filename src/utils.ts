/*
 * utility functions and types
 */


function getElement<T extends HTMLElement>(id: string): T {
  let elem = document.querySelector<T>(`#${id}`);
  if (elem) {
    return elem;
  } else {
    throw new Error(`element does not exist`);
  }
}

type Optional<T> = T | undefined;
type Nullable<T> = T | null;

export { getElement, type Nullable, type Optional };

