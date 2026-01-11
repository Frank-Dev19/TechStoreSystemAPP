// src/app/core/services/sales/http-params.util.ts
import { HttpParams } from '@angular/common/http';

export function toHttpParams(obj: Record<string, any>): HttpParams {
    let params = new HttpParams();

    Object.entries(obj ?? {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;

        // arrays: key=value1&key=value2
        if (Array.isArray(value)) {
            value.forEach(v => {
                if (v === undefined || v === null || v === '') return;
                params = params.append(key, String(v));
            });
            return;
        }

        params = params.set(key, String(value));
    });

    return params;
}
