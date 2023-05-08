/**
 * Parse an array into a query string where every value has the same key.
 * @param {string} key - The key to use. api will be repeated in the query for every value in the array
 * @param {string[]|string} arr - Array of values to parse into query string.
 */
export function parseArrayToQueryString(
    key: string,
    arr: readonly unknown[]
): string {
    const list = Array.isArray(arr) ? arr : [arr];
    const result = list.map((value) => `${key}=${value}`).join("&");

    return result;
}

/**
 * Parses an object into a query string. If the value of a property is an array, that array will be parsed with the `parseArrayToQueryString` function. If a value is undefined or null, it will be skipped.
 * @param {Object} options - The options to parse.
 */
export function parseOptions<T>(options: T): string {
    let query = "";

    for (const key in options) {
        const value = options[key];

        if (value === null || value === undefined) continue;

        if (Array.isArray(value)) query += parseArrayToQueryString(key, value);
        else query += `${key}=${value}&`;
    }

    return query.replace(/&$/, "");
}
