// Remembers the customer's uploaded photo while the app is open,
// so they can try many outfits without uploading the photo again.
import React, { createContext, useContext, useState } from 'react';

const TryOnContext = createContext(null);

export function TryOnProvider({ children }) {
  // photo = { id, localUri } after a successful upload
  const [photo, setPhoto] = useState(null);

  return <TryOnContext.Provider value={{ photo, setPhoto, clearPhoto: () => setPhoto(null) }}>{children}</TryOnContext.Provider>;
}

export function useTryOn() {
  return useContext(TryOnContext);
}
