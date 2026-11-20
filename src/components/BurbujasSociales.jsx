export default function BurbujasSociales() {
  const telefonoWhatsApp = '593996389566';
  const mensajeWhatsApp = encodeURIComponent(
    'Hola Motopartsec, necesito información sobre mantenimiento o repuestos.'
  );

  const urlTikTok = 'https://www.tiktok.com/@motopartsec.vallechillos';

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-4">

      {/* Burbuja TikTok */}
      <a
        href={urlTikTok}
        target="_blank"
        rel="noopener noreferrer"
        title="Síguenos en TikTok"
        aria-label="Síguenos en TikTok"
        className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform border border-gray-700"
      >
        <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.9 2.9 0 0 1-2.9 2.9 2.9 2.9 0 0 1-2.9-2.9 2.9 2.9 0 0 1 2.9-2.9c.3 0 .6.05.87.14V9.39a6.35 6.35 0 0 0-.87-.06A6.35 6.35 0 0 0 3.12 15.68 6.35 6.35 0 0 0 9.47 22a6.35 6.35 0 0 0 6.35-6.35V8.7a8.18 8.18 0 0 0 4.77 1.53V6.78a4.85 4.85 0 0 1-1-.09z"/>
        </svg>
      </a>

      {/* Burbuja WhatsApp */}
      <a
        href={`https://wa.me/${telefonoWhatsApp}?text=${mensajeWhatsApp}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Chatea por WhatsApp"
        aria-label="Chatea por WhatsApp"
        className="w-16 h-16 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white flex items-center justify-center shadow-xl shadow-emerald-600/40 hover:scale-110 transition-transform"
      >
        <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z"/>
        </svg>
      </a>

    </div>
  );
}