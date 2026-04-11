import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register('tsx/esm', pathToFileURL('./'));
await import('./server/index.ts');
