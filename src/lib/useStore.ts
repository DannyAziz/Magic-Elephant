import { useEffect, useState } from "react";
import { Store } from "tauri-plugin-store-api";

const useStoreValue = (storeName: string, keyName: string) => {
  const store = new Store(storeName);
  const [value, setValue] = useState<null | unknown>(null);

  useEffect(() => {
    (async () => {
      const value = await store.get(keyName);
      setValue(value);
      const listen = await store.onKeyChange(keyName, (value) => {
        setValue(value);
      });

      return () => {
        listen();
      };
    })();
  }, []);

  return value;
};

export { useStoreValue };
