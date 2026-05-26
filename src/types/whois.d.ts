declare module 'whois' {
  export interface WhoisOptions {
    follow: number;
    timeout: number;
    proxy?: string;
    server?: string;
    verbose?: boolean;
  }

  export function lookup(domain: string, callback: (err: Error | null, data: string) => void): void;
  export function lookup(domain: string, options: WhoisOptions, callback: (err: Error | null, data: string) => void): void;
} 