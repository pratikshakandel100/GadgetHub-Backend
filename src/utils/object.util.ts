export const stripUndefined = <T extends Record<string, any>>(obj: T): Partial<T> =>
    Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined)
    ) as Partial<T>;
