type Listener = () => void;

let revision = 0;
const listeners = new Set<Listener>();

export function requestSavedPlacesRefresh() {
  revision += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeSavedPlacesRefresh(listener: Listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getSavedPlacesRefreshRevision() {
  return revision;
}
