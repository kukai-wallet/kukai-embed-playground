import type { PROVIDERS } from "../utils/providers";

export interface User {
    address: string
    name: string | null
    provider: PROVIDERS
}