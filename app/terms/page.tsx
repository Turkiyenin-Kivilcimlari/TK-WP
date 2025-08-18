import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description: "Topluluk platformu kullanım şartları ve koşulları",
}

export default function TermsOfServicePage() {
  // Gerçek güncelleme tarihi (gelecek tarih yerine)
  const lastUpdated = new Date("2025-05-05").toLocaleDateString("tr-TR")
  

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 print-styles">
      <h1 className="text-3xl font-bold mb-6">Kullanım Şartları</h1>
      
      <div className="prose prose-slate max-w-none">
        <p className="text-muted-foreground mb-6">
          Son güncellenme tarihi: {lastUpdated}
        </p>
        
        <section id="genel" className="mb-8" aria-labelledby="genel-heading">
          <h2 id="genel-heading" className="text-2xl font-semibold mb-4">1. Genel Hükümler</h2>
          <p>
            Bu Kullanım Şartları, topluluk platformuna erişiminizi ve platformun kullanımını düzenleyen şartları ve koşulları içermektedir. 
            Platformumuzu kullanarak bu şartları kabul etmiş sayılırsınız. Platformu kullanmaya devam etmeniz, bu şartlara sürekli 
            bağlılığınızı gösterir.
          </p>
        </section>

        <section id="hesap" className="mb-8" aria-labelledby="hesap-heading">
          <h2 id="hesap-heading" className="text-2xl font-semibold mb-4">2. Hesap Oluşturma ve Güvenlik</h2>
          <p>
            Platform hizmetlerinden yararlanabilmek için bir hesap oluşturmanız gerekebilir. Hesap bilgilerinizin gizliliğini korumak ve 
            hesabınız altında gerçekleşen tüm etkinlikler için sorumluluk size aittir. Şifrenizi güvende tutmanız ve hesabınızla ilgili 
            herhangi bir güvenlik ihlali olduğunda bize bildirmeniz gerekmektedir.
          </p>
        </section>

        <section id="icerik" className="mb-8" aria-labelledby="icerik-heading">
          <h2 id="icerik-heading" className="text-2xl font-semibold mb-4">3. Kullanıcı İçeriği</h2>
          <p>
            Platformumuzda paylaştığınız, yüklediğiniz veya ilettiğiniz içeriklerden siz sorumlusunuz. Bu içerikler:
          </p>
          <ul className="list-disc pl-5 mt-2 mb-4">
            <li>Yasalara uygun olmalıdır</li>
            <li>Başkalarının haklarını ihlal etmemelidir</li>
            <li>Platformumuzun topluluk kurallarına uygun olmalıdır</li>
          </ul>
          <p>
            Platformumuz, uygunsuz olduğu düşünülen herhangi bir içeriği kaldırma veya reddetme hakkını saklı tutar.
          </p>
        </section>

        <section id="mulkiyet" className="mb-8" aria-labelledby="mulkiyet-heading">
          <h2 id="mulkiyet-heading" className="text-2xl font-semibold mb-4">4. Fikri Mülkiyet</h2>
          <p>
            Platform ve içerdiği tüm materyaller (metin, grafik, logo, simge, görüntü, ses ve yazılım dahil) platformumuza 
            veya lisans verenlere aittir ve telif hakkı, ticari marka ve diğer fikri mülkiyet yasaları tarafından korunmaktadır.
          </p>
        </section>

        <section id="degisiklik" className="mb-8" aria-labelledby="degisiklik-heading">
          <h2 id="degisiklik-heading" className="text-2xl font-semibold mb-4">5. Hizmet Değişiklikleri</h2>
          <p>
            Platformumuz ve sunduğumuz hizmetler zaman içinde değişebilir. Platformumuz, herhangi bir zamanda hizmetlerimizin tamamını 
            veya bir kısmını geçici veya kalıcı olarak değiştirme, askıya alma veya sonlandırma hakkını saklı tutar.
          </p>
        </section>

        <section id="sorumluluk" className="mb-8" aria-labelledby="sorumluluk-heading">
          <h2 id="sorumluluk-heading" className="text-2xl font-semibold mb-4">6. Sorumluluk Sınırlaması</h2>
          <p>
            Platformumuz, içerik veya hizmetlerimizin kullanımından kaynaklanabilecek herhangi bir doğrudan, dolaylı, arızi, 
            özel veya sonuç olarak ortaya çıkan zararlardan sorumlu tutulamaz.
          </p>
        </section>

        <section id="hukuk" className="mb-8" aria-labelledby="hukuk-heading">
          <h2 id="hukuk-heading" className="text-2xl font-semibold mb-4">7. Uygulanabilir Hukuk</h2>
          <p>
            Bu Kullanım Şartları, Türkiye Cumhuriyeti kanunlarına tabidir ve bu kanunlara göre yorumlanacaktır.
          </p>
        </section>

        <section id="iletisim" className="mb-8" aria-labelledby="iletisim-heading">
          <h2 id="iletisim-heading" className="text-2xl font-semibold mb-4">8. İletişim</h2>
          <p>
            Bu Kullanım Şartları hakkında herhangi bir sorunuz veya geri bildiriminiz varsa, lütfen bizimle iletişime geçin.
          </p>
        </section>

      </div>
    </div>
  )
}
