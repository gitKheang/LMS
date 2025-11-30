import { InjectionToken } from '@angular/core';
import { LibraryApi } from './library-api.types';

export const LIBRARY_API = new InjectionToken<LibraryApi>('LIBRARY_API');
