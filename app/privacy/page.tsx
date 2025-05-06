import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "Topluluk platformu gizlilik politikası ve kişisel verilerin korunması",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Gizlilik Politikası</h1>
      
      <div className="prose prose-slate max-w-none">
        <p className="text-muted-foreground mb-6">
          Son güncellenme tarihi: {new Date("2025-05-05").toLocaleDateString("tr-TR")}
        </p>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Veri Sorumlusu</h2>
          <p>
            Bu gizlilik politikası kapsamında, kişisel verileriniz Türkiye’nin Kıvılcımları tarafından 6698 sayılı Kişisel Verilerin 
            Korunması Kanunu ("KVKK") uyarınca veri sorumlusu olarak işlenmektedir.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Topladığımız Bilgiler</h2>
          <p>
            Topluluk platformu olarak, size daha iyi hizmet verebilmek için belirli kişisel bilgileri topluyoruz. Bu bilgiler şunları içerebilir:
          </p>
          <ul className="list-disc pl-5 mt-2 mb-4">
            <li>Ad-soyad, e-posta adresi ve iletişim bilgileri</li>
            <li>Hesap oluşturma ve oturum açma bilgileri</li>
            <li>Platformumuzda paylaştığınız içerik ve yorumlar</li>
            <li>İnternet protokol (IP) adresi, tarayıcı türü, ziyaret saatleri gibi teknik bilgiler</li>
            <li>Platformumuzu nasıl kullandığınızla ilgili analiz verileri</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Yasal Dayanak</h2>
          <p>
            Kişisel verilerinizi işlememizin yasal dayanakları şunlardır:
          </p>
          <ul className="list-disc pl-5 mt-2 mb-4">
            <li>Açık rızanız</li>
            <li>Sizinle olan sözleşmemizin ifası için gerekli olması</li>
            <li>Yasal yükümlülüklerimizin yerine getirilmesi</li>
            <li>Meşru menfaatlerimizin gerektirmesi</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Bilgileri Kullanma Amacımız</h2>
          <p>
            Topladığımız bilgileri aşağıdaki amaçlar için kullanabiliriz:
          </p>
          <ul className="list-disc pl-5 mt-2 mb-4">
            <li>Hesabınızı oluşturmak ve yönetmek</li>
            <li>Size platform hizmetlerimizi sunmak</li>
            <li>Platformumuzu geliştirmek ve kullanıcı deneyimini iyileştirmek</li>
            <li>Size özelleştirilmiş içerik ve öneriler sunmak</li>
            <li>İletişim ve destek sağlamak</li>
            <li>Güvenlik ve doğrulama işlemlerini yürütmek</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Bilgilerin Paylaşılması</h2>
          <p>
            Kişisel bilgileriniz genellikle yalnızca platformumuz içinde kullanılır. Ancak bazı durumlarda bilgilerinizi şu üçüncü taraflarla paylaşabiliriz:
          </p>
          <ul className="list-disc pl-5 mt-2 mb-4">
            <li>Hizmetlerimizi sunmamıza yardımcı olan servis sağlayıcılar</li>
            <li>Yasal yükümlülüklerimizi yerine getirmek gerektiğinde hukuki makamlar</li>
            <li>Sizin açık rızanızla belirtilen diğer üçüncü taraflar</li>
          </ul>
          <p className="mt-2">
            Kişisel verilerinizin yurt dışına aktarılması gerektiği durumlarda, KVKK'nın 9. maddesinde öngörülen şartlara uygun olarak ve gerekli güvenlik önlemleri alınarak aktarım yapılmaktadır.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Veri Saklama Süresi</h2>
          <p>
            Kişisel verilerinizi yalnızca toplandıkları amaç için gerekli olan süre boyunca saklıyoruz. Bu süre, hesabınızın aktif olduğu süreyi ve yasal yükümlülüklerimizi yerine getirmek için gereken ek süreleri kapsar. Hesabınızı sildiğinizde, kişisel verileriniz makul bir süre içerisinde sistemlerimizden silinecek veya anonimleştirilecektir.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Veri Güvenliği</h2>
          <p>
            Kişisel verilerinizin güvenliğini sağlamak için uygun teknik ve organizasyonel önlemleri almaktayız. 
            Bu önlemler arasında şifreleme, erişim kontrolü, güvenlik duvarları ve düzenli güvenlik değerlendirmeleri bulunmaktadır.
            Ancak, internet üzerinden yapılan hiçbir veri aktarımının veya elektronik depolamanın %100 güvenli olmadığını 
            unutmayın. Kişisel bilgilerinizin güvenliğini tam olarak garanti edemeyiz.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Çerezler ve İzleme Teknolojileri</h2>
          <p>
            Platformumuzda çerezleri ve benzer teknolojileri kullanıyoruz. Çerez kullanımı hakkında detaylı bilgi için 
             <Link href="/cookies" className="text-primary hover:underline"> Çerez Politikamızı</Link> inceleyin.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Kullanıcı Hakları</h2>
          <p>
            KVKK kapsamında kişisel verilerinizle ilgili olarak aşağıdaki haklara sahipsiniz:
          </p>
          <ul className="list-disc pl-5 mt-2 mb-4">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme hakkı</li>
            <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme hakkı</li>
            <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme hakkı</li>
            <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme hakkı</li>
            <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme hakkı</li>
            <li>KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme hakkı</li>
            <li>Kişisel verilerinizin aktarıldığı üçüncü kişilere yukarıdaki düzeltme, silme ve yok edilme bildiriminin yapılmasını isteme hakkı</li>
            <li>İşlenen verilerinizin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme hakkı</li>
            <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme hakkı</li>
          </ul>
          <p className="mt-2">
            Bu haklarınızı kullanmak için, lütfen aşağıdaki iletişim bilgilerini kullanarak bize ulaşın.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Çocukların Gizliliği</h2>
          <p>
            Platformumuz 13 yaşın altındaki çocuklar için tasarlanmamıştır ve onlardan bilerek kişisel bilgi toplamıyoruz. 
            13 yaşın altındaki bir çocuktan bilgi topladığımızı fark edersek, bu bilgileri derhal silmek için adımlar atarız.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Veri İhlali Bildirimi</h2>
          <p>
            Kişisel verilerinizi etkileyen bir veri ihlali durumunda, yürürlükteki kanunlar uyarınca gerekli bildirimleri yapmayı ve ihlali çözmek için uygun önlemleri almayı taahhüt ederiz.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Gizlilik Politikasında Değişiklikler</h2>
          <p>
            Bu Gizlilik Politikasını herhangi bir zamanda güncelleme hakkını saklı tutarız. Değişiklikler yapıldığında, 
            güncelleme tarihini değiştirerek ve gerektiğinde platformumuzda bildirimde bulunarak sizi bilgilendiririz.
          </p>
          <p className="mt-2">
            Bu gizlilik politikasını düzenli olarak incelemenizi öneririz.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. İletişim</h2>
          <p>
            Bu Gizlilik Politikası veya kişisel verilerinizin işlenmesiyle ilgili sorularınız, talepleriniz veya endişeleriniz varsa, lütfen aşağıdaki iletişim bilgilerinden bizimle iletişime geçmekten çekinmeyin:
          </p>
          <p className="mt-2">
            <strong>E-posta:</strong> <a href="mailto:info@turkiyeninkivilcimlari.com" className="text-primary hover:underline">info@turkiyeninkivilcimlari.com</a><br />
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">14. İlgili Politikalar</h2>
          <p>
            Bu Gizlilik Politikası ile birlikte aşağıdaki politikalarımızı da incelemenizi öneririz:
          </p>
          <ul className="list-disc pl-5 mt-2">
            <li><Link href="/cookies" className="text-primary hover:underline">Çerez Politikası</Link></li>
            <li><Link href="/terms" className="text-primary hover:underline">Kullanım Koşulları</Link></li>
          </ul>
        </section>
      </div>
    </div>
  )
}
