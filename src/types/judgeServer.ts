// A judge server as reported by GET /api/v1/judge-servers (JudgeServerResponseDto).
// cpuUsage/memoryUsage are percentages; `alive` = heartbeat recent; `disabled` = admin-disabled.
export interface JudgeServer {
    hostname: string
    ip: string
    judgerVersion: string
    cpuCore: number
    cpuUsage: number
    memoryUsage: number
    serviceUrl: string
    lastHeartbeat: string
    taskNumber: number
    disabled: boolean
    alive: boolean
}
