// GLOBAL WORKER SECURITY PATCH
// This resolves "SecurityError: Failed to construct 'Worker'" on localhost/shared hosting
// by proxying all worker creations through a local absolute-path Blob.
(function() {
    if (typeof window === 'undefined') return;
    const OriginalWorker = window.Worker;
    if (!OriginalWorker) return;

    window.Worker = class extends OriginalWorker {
        constructor(scriptURL: string | URL, options?: WorkerOptions) {
            const urlString = scriptURL.toString();
            
            // Skip already proxied blob URLs
            if (urlString.startsWith('blob:')) {
                super(scriptURL, options);
                return;
            }

            // Convert relative paths to absolute to ensure the Blob can find them
            const absoluteURL = new URL(urlString, window.location.href).href;
            const isModule = options?.type === 'module';
            
            const blobCode = isModule 
                ? `import "${absoluteURL}";` 
                : `importScripts("${absoluteURL}");`;
                
            const blob = new Blob([blobCode], { type: 'application/javascript' });
            const blobURL = URL.createObjectURL(blob);
            
            super(blobURL, options); 
        }
    } as any;
})();

import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;
