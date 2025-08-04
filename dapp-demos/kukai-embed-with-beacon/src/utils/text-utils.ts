export function formatAddress(value: string) {
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
}

export const DEFAULT_PAYLOAD = [
    {
        "kind": "transaction",
        "amount": "12345",
        "destination": "tz1arY7HNDq17nrZJ7f3sikxuHZgeopsU9xq"
    }
]

export const DEFAULT_EXPRESSION = `0x05010000004254657a6f73205369676e6564204d6573736167653a206d79646170702e636f6d20323032312d30312d31345431353a31363a30345a2048656c6c6f20776f726c6421`