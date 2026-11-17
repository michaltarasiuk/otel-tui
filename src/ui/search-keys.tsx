import { FocusScope } from "./focus.tsx";
import { Key } from "./key-hints.tsx";
import type { Search } from "./use-search.ts";

interface SearchKeysProps {
  search: Search;
  onApply?: () => void;
}

export function SearchKeys({ search, onApply }: SearchKeysProps) {
  return (
    <>
      <FocusScope focused={!search.isEditing}>
        <Key name="/" onPress={() => search.edit()}>
          search
        </Key>
      </FocusScope>
      {search.isEditing && (
        <Key
          name="return"
          onPress={() => {
            search.apply();
            onApply?.();
          }}
        >
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
