export interface Handler {
    keys: string[];
    description: string;
    action: (this: any) => void;
}
