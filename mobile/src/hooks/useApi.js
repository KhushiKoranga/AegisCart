import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Loads data when the screen opens (and again when you come back to it).
// Usage: const { data, loading, error, reload } = useApi(() => getCart(), [dependency]);
export default function useApi(loadFunction, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await loadFunction());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return { data, loading, error, reload: load };
}
