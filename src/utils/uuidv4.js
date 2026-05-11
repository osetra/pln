/**
 * Generate a UUID v4 string (compact implementation).
 *
 * Uses crypto.getRandomValues when available (one random byte per hex nibble),
 * falls back to Math.random() if crypto isn't present.
 *
 * @returns {string} UUID v4 (format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 */
export default function uuidv4(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = crypto?.getRandomValues ? crypto.getRandomValues(new Uint8Array(1))[0] & 15 : Math.floor(Math.random()*16);
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    })
}
