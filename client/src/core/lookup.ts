
export interface ILookup {
    id: number | string
    xcode: string
    description: string
}

export interface LookupData extends ILookup {
    id: number | string
    groupe: string
    xcode: string
    description: string
    value1: string | number
    value2: string | number
    value3: string | number
    sortOrder: number
    disabled: boolean
}
