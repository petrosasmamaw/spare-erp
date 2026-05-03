(async () => {
  try {
    const mod = await import('qz-tray');
    const qz = mod?.default || mod;

    try {
      qz.security.setCertificatePromise(() => Promise.resolve());
      qz.security.setSignaturePromise(() => (toSign) => Promise.resolve({ signature: '' }));
    } catch (e) {
      // ignore
    }

    console.log('qz module loaded');

    console.log('websocket active before connect:', qz.websocket.isActive());
    if (!qz.websocket.isActive()) {
      console.log('attempting to connect to QZ Tray websocket...');
      await qz.websocket.connect();
    }

    console.log('websocket active after connect:', qz.websocket.isActive());

    // safer printer query with timeout
    const printers = await Promise.race([
      qz.printers.get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('printers query timed out')), 8000)),
    ]).catch((e) => {
      console.error('printers lookup failed:', e && e.message ? e.message : e);
      return null;
    });

    console.log('available printers:', printers);

    try {
      await qz.websocket.disconnect();
      console.log('disconnected');
    } catch (e) {
      console.warn('disconnect warning:', e && e.message ? e.message : e);
    }

    process.exit(0);
  } catch (err) {
    console.error('connect test failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
