/**
 * Advanced Google Drive Integration Service (COEP-Compatible)
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const DEVELOPER_KEY = 'AIzaSyBsdfVtJfbxecu619_D0zjzKrrHDpi7UEQ'; 
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';

let tokenClient: any = null;
let gapiLoaded = false;
let gsisLoaded = false;

/**
 * Load a script in a COEP-compatible way by fetching it and creating a blob URL
 * This helps bypass 'require-corp' restrictions for scripts that don't have CORP headers.
 */
async function loadScriptCOEP(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    // Do NOT set crossOrigin for Google scripts as they don't support CORS
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

export async function initGoogleDrive() {
  if (gapiLoaded && gsisLoaded) return;
  
  console.log('[Drive] initGoogleDrive starting...');

  try {
    // 1. Load GAPI
    if (!gapiLoaded) {
      await loadScriptCOEP('https://apis.google.com/js/api.js');
      console.log('[Drive] GAPI script loaded');
      await new Promise<void>((res) => (window as any).gapi.load('picker', res));
      console.log('[Drive] GAPI Picker loaded');
      gapiLoaded = true;
    }

    // 2. Load GSI
    if (!gsisLoaded) {
      await loadScriptCOEP('https://accounts.google.com/gsi/client');
      console.log('[Drive] GSI script loaded');
      
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp: any) => {
          console.log('[Drive] Token callback triggered', resp);
          if (resp.error) {
            alert('خطأ من جوجل: ' + (resp.error_description || resp.error));
            if ((window as any)._drive_reject) (window as any)._drive_reject(new Error(resp.error));
            return;
          }
          console.log('[Drive] Access token received successfully');
          localStorage.setItem('drive_access_token', resp.access_token);
          localStorage.setItem('drive_token_expiry', (Date.now() + (resp.expires_in * 1000)).toString());
          window.dispatchEvent(new Event('drive-auth-changed'));
          if ((window as any)._drive_resolve) (window as any)._drive_resolve(resp.access_token);
        },
      });
      gsisLoaded = true;
      console.log('[Drive] GSI client inited');
    }
  } catch (err: any) {
    console.error('[Drive] Init failed', err);
    alert('فشل تحميل مكتبات جوجل. قد يكون السبب هو حماية المتصفح أو إضافة AdBlock. يرجى محاولة فتح الموقع في نافذة متخفية (Incognito).');
    throw err;
  }
}

async function getAccessToken(forceSelect = false): Promise<string> {
  const token = localStorage.getItem('drive_access_token');
  const expiry = localStorage.getItem('drive_token_expiry');

  if (!forceSelect && token && expiry && parseInt(expiry) > Date.now() + 60000) {
    return token;
  }

  console.log('[Drive] Requesting access token with prompt: consent');
  return new Promise((resolve, reject) => {
    const popupTimeout = setTimeout(() => {
       console.warn('[Drive] Access token request timed out after 60s. Popup might be blocked.');
       alert('تنبيه: إذا لم تظهر نافذة جوجل، يرجى السماح بالنوافذ المنبثقة من إعدادات المتصفح.');
    }, 60000);

    (window as any)._drive_resolve = (token: string) => {
       clearTimeout(popupTimeout);
       resolve(token);
    };
    (window as any)._drive_reject = (err: any) => {
       clearTimeout(popupTimeout);
       reject(err);
    };
    
    try {
      tokenClient.requestAccessToken({ prompt: 'consent' });
      console.log('[Drive] requestAccessToken() called successfully');
    } catch (err) {
      console.error('[Drive] requestAccessToken() crashed', err);
      reject(err);
    }
  });
}

export function disconnectDrive() {
  localStorage.removeItem('drive_access_token');
  localStorage.removeItem('drive_token_expiry');
  window.dispatchEvent(new Event('drive-auth-changed'));
}

export async function pickFileFromDrive(): Promise<File | null> {
  try {
    await initGoogleDrive();
    
    let token: string;
    try {
      token = await getAccessToken();
    } catch (e) {
      token = await getAccessToken(true);
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('[Drive] Opening Picker...');
        const picker = new (window as any).google.picker.PickerBuilder()
          .addView((window as any).google.picker.ViewId.DOCS)
          .setOAuthToken(token)
          .setDeveloperKey(DEVELOPER_KEY)
          .setOrigin(window.location.origin)
          .setCallback(async (data: any) => {
            if (data.action === (window as any).google.picker.Action.PICKED) {
              const doc = data.docs[0];
              const fileId = doc.id;
              try {
                const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                const blob = await res.blob();
                resolve(new File([blob], doc.name, { type: doc.mimeType }));
              } catch (err) {
                alert('خطأ أثناء تحميل الملف المختار.');
                reject(err);
              }
            } else if (data.action === (window as any).google.picker.Action.CANCEL) {
              resolve(null);
            }
          })
          .build();
        picker.setVisible(true);
      } catch (e: any) {
        alert('خطأ أثناء فتح قائمة الملفات: ' + e.message);
        reject(e);
      }
    });
  } catch (err: any) {
    console.error('[Drive] Picker fail', err);
    throw err;
  }
}

export async function saveFileToDrive(file: File): Promise<boolean> {
  try {
    await initGoogleDrive();
    const token = await getAccessToken();
    const metadata = { name: file.name, mimeType: file.type };
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return res.ok;
  } catch (err: any) {
    alert('فشل في حفظ الملف: ' + err.message);
    return false;
  }
}
