import { copyFileSync } from "node:fs"
import { URL } from "node:url"

// Keep the streaming protocol beside the compiled provider implementation.
for (const file of ["stream-list.proto", "stream-list.LICENSE"]) {
    copyFileSync(
        new URL(`../src/providers/youtube/${file}`, import.meta.url),
        new URL(`../dist/providers/youtube/${file}`, import.meta.url),
    )
}
