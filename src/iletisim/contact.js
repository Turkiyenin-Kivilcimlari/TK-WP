document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    const messageArea = document.getElementById('message');

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const message = messageArea.value;

        // Burada form verilerini işleyebilir veya bir API'ye gönderebilirsiniz
        console.log('E-posta:', email);
        console.log('Mesaj:', message);

        alert('Mesajınız gönderildi! Teşekkür ederiz.');
        this.reset();
    });

    // Metin vurgulama fonksiyonu
    function highlightText() {
        const selectedText = window.getSelection().toString();
        if (selectedText) {
            const range = window.getSelection().getRangeAt(0);
            const span = document.createElement('span');
            span.className = 'highlight';
            span.textContent = selectedText;
            range.deleteContents();
            range.insertNode(span);
        }
    }

    messageArea.addEventListener('mouseup', highlightText);
});