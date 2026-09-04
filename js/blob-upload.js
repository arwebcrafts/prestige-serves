/* Direct browser -> Vercel Blob uploads.
 *
 * Vercel caps every serverless request body at 4.5 MB, so routing a 25 MB court
 * packet through /api/request is impossible — the platform drops the connection
 * and the browser reports a bare "Network error". Instead we ask our own
 * /api/blob-upload-token route for a short-lived, scoped client token and PUT
 * the file straight to Blob storage, which has no such cap. Only the resulting
 * URL is submitted with the form.
 *
 * This mirrors what @vercel/blob's client `upload()` does, written in plain ES5
 * so it can be dropped into a site with no build step.
 */
(function (global) {
  'use strict';

  var BLOB_API_BASE = 'https://blob.vercel-storage.com';
  var BLOB_API_VERSION = '7';
  var TOKEN_ENDPOINT = '/api/blob-upload-token';
  var MAX_FILE_BYTES = 25 * 1024 * 1024;
  var MAX_FILE_MB = 25;

  function extensionOf(name) {
    var dot = String(name || '').lastIndexOf('.');
    return dot === -1 ? '' : String(name).slice(dot).toLowerCase();
  }

  var ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.heic', '.tif', '.tiff'];

  function humanSize(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  /* Validate before touching the network so oversized files fail instantly and
   * with a sentence the client can act on. */
  function validateFile(file) {
    if (!file) return 'File is missing.';
    if (file.size === 0) return '"' + file.name + '" is empty.';
    if (file.size > MAX_FILE_BYTES) {
      return '"' + file.name + '" is ' + humanSize(file.size) + '. The limit is ' +
        MAX_FILE_MB + ' MB per file — please email it to info@prestigeserves.com instead.';
    }
    if (ALLOWED_EXTENSIONS.indexOf(extensionOf(file.name)) === -1) {
      return '"' + file.name + '" is not an accepted file type. Please upload a PDF, Word document, or image.';
    }
    return null;
  }

  function safePathname(name) {
    var cleaned = String(name || 'document')
      .replace(/[\\/]/g, '-')
      .replace(/[^\w.\- ]+/g, '')
      .replace(/\s+/g, '-')
      .slice(-120);
    if (!cleaned || cleaned === '.') cleaned = 'document';
    return 'service-requests/' + cleaned;
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    options = options || {};
    if (typeof AbortController === 'undefined') return fetch(url, options);
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    options.signal = controller.signal;
    return fetch(url, options).then(function (res) {
      clearTimeout(timer);
      return res;
    }, function (err) {
      clearTimeout(timer);
      throw err;
    });
  }

  function requestClientToken(pathname) {
    var payload = {
      type: 'blob.generate-client-token',
      payload: {
        pathname: pathname,
        callbackUrl: new URL(TOKEN_ENDPOINT, global.location.href).href,
        clientPayload: null,
        multipart: false
      }
    };
    return fetchWithTimeout(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 20000).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok || !data || !data.clientToken) {
          throw new Error((data && data.message) || 'Could not start the upload. Please try again.');
        }
        return data.clientToken;
      });
    });
  }

  /* PUT the bytes straight to Blob storage. This request never touches our
   * serverless function, so the 4.5 MB body cap does not apply. */
  function putToBlob(file, pathname, clientToken) {
    return fetchWithTimeout(BLOB_API_BASE + '/' + pathname, {
      method: 'PUT',
      headers: {
        'authorization': 'Bearer ' + clientToken,
        'x-api-version': BLOB_API_VERSION,
        'x-content-type': file.type || 'application/octet-stream'
      },
      body: file
    }, 180000).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok || !data || !data.url) {
          var reason = (data && (data.error && data.error.message)) || ('upload failed with status ' + res.status);
          throw new Error('Could not upload "' + file.name + '" — ' + reason);
        }
        return { name: file.name, url: data.url, size: file.size, contentType: file.type || '' };
      });
    });
  }

  function uploadFile(file) {
    var problem = validateFile(file);
    if (problem) return Promise.reject(new Error(problem));
    var pathname = safePathname(file.name);
    return requestClientToken(pathname).then(function (clientToken) {
      return putToBlob(file, pathname, clientToken);
    });
  }

  /* Uploads sequentially. Parallel uploads of large documents on a client's
   * office connection tend to make all of them time out together. */
  function uploadFiles(files, onProgress) {
    var list = Array.prototype.slice.call(files || []);
    var results = [];
    var chain = Promise.resolve();
    list.forEach(function (file, index) {
      chain = chain.then(function () {
        if (typeof onProgress === 'function') {
          onProgress({ index: index, total: list.length, name: file.name, status: 'uploading' });
        }
        return uploadFile(file).then(function (result) {
          results.push(result);
          if (typeof onProgress === 'function') {
            onProgress({ index: index, total: list.length, name: file.name, status: 'done' });
          }
        });
      });
    });
    return chain.then(function () { return results; });
  }

  global.PSBlobUpload = {
    uploadFile: uploadFile,
    uploadFiles: uploadFiles,
    validateFile: validateFile,
    humanSize: humanSize,
    MAX_FILE_BYTES: MAX_FILE_BYTES,
    MAX_FILE_MB: MAX_FILE_MB,
    ALLOWED_EXTENSIONS: ALLOWED_EXTENSIONS
  };
})(window);
