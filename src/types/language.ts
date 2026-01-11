import type { BaseModel } from "@/types/common"

export interface Language extends BaseModel {
    id: string
    name: string
    identifier: string
    extension: string
    compileCommand: string
    runCommand: string
    seccompRule: string
    srcName: string
    exeName: string
    compileMaxMemory: number
    maxMemory: number
    isDisabled: boolean
}
