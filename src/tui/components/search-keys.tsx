import { FocusScope } from "./focus.tsx";
import { Key } from "./key-hints.tsx";
import type { useSearch } from "./use-search.ts";

interface SearchKeysProps {
  search: ReturnType<typeof useSearch>;
}

export function SearchKeys({ search }: SearchKeysProps) {
  return (
    <>
      <FocusScope focused={!search.isEditing}>
        <Key name="/" onPress={() => search.edit()}>
          search
        </Key>
      </FocusScope>
      {search.isEditing && (
        <Key name="return" onPress={() => search.apply()}>
          apply
        </Key>
      )}
      {(search.isEditing || search.text !== "") && (
        <Key name="escape" onPress={() => search.clear()}>
          clear
        </Key>
      )}
    </>
  );
}
