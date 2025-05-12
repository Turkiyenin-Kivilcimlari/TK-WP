import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description: "Topluluk platformu çerez (cookie) kullanım politikası",
}

export default function CookiePolicyPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Çerez Politikası</h1>
      
      <div className="prose prose-slate max-w-none">
        <p className="text-muted-foreground mb-6">
          Son güncellenme tarihi: {new Date("2025-05-05").toLocaleDateString("tr-TR")}
        </p>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Çerezler Nedir?</h2>
          <p>
            Çerezler (cookies), bir web sitesini ziyaret ettiğinizde tarayıcınız tarafından bilgisayarınızda veya mobil 
            cihazınızda depolanan küçük metin dosyalarıdır. Bu dosyalar, web sitesinin veya üçüncü taraf sunucuların 
            cihazınızı tanımasını ve web sitesi gezinmenizi daha verimli hale getirmeyi sağlar.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Kullandığımız Çerez Türleri</h2>
          <p>
            Web sitemizde kullandığımız çerez türleri şunlardır:
          </p>
          <ul className="list-disc pl-5 mt-2 mb-4">
            <li>
              <strong>Zorunlu Çerezler:</strong> Bu çerezler web sitesinin düzgün çalışması için gereklidir ve sistemlerimizde 
              kapatılamazlar. Genellikle yalnızca sizin tarafınızdan yapılan ve gizlilik tercihlerinizi ayarlama, oturum açma 
              veya form doldurma gibi hizmet taleplerine karşılık olarak ayarlanırlar.
            </li>
            <li>
              <strong>Performans Çerezleri:</strong> Bu çerezler, ziyaretçilerin web sitesini nasıl kullandığı hakkında bilgi 
              toplamak ve web sitesinin performansını analiz etmek için kullanılır. Bu çerezler, web sitesinin hangi sayfalarının 
              en popüler olduğunu, hangi sayfalar arasında bağlantıların etkili olduğunu anlamamıza yardımcı olur.
            </li>
            <li>
              <strong>İşlevsellik Çerezleri:</strong> Bu çerezler, tercihlerinizi hatırlamak ve size gelişmiş, daha kişisel bir 
              deneyim sunmak için kullanılır, örneğin dil tercihlerinizi hatırlamak için.
            </li>
            <li>
              <strong>Hedefleme/Reklam Çerezleri:</strong> Bu çerezler, size ve ilgi alanlarınıza daha uygun reklamlar sunmak için 
              kullanılır. Aynı zamanda bir reklamın görüntülenme sayısını sınırlamaya ve reklam kampanyasının etkinliğini ölçmeye 
              yardımcı olurlar.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Üçüncü Taraf Çerezleri</h2>
          <p>
            Web sitemizde bazı üçüncü taraf hizmet sağlayıcılarımızın da çerezleri bulunmaktadır. Bu üçüncü taraf çerezleri 
            aşağıdaki amaçlar için kullanılabilir:
          </p>
          <ul className="list-disc pl-5 mt-2 mb-4">
            <li>Analitik hizmetler (örn. Google Analytics)</li>
            <li>Sosyal medya özellikleri (örn. Facebook, Twitter)</li>
            <li>Reklam ağları</li>
          </ul>
          <p className="mt-2">
            Bu üçüncü taraf hizmet sağlayıcılar kendi gizlilik politikalarına sahip olabilirler ve kendi çerezlerini nasıl 
            kullandıklarına dair farklı politikaları olabilir. Bu üçüncü taraf hizmet sağlayıcıların gizlilik politikalarını 
            incelemenizi öneririz.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Çerezleri Yönetme</h2>
          <p>
            Çoğu web tarayıcısı, çerezleri otomatik olarak kabul edecek şekilde ayarlanmıştır. Ancak, tarayıcınızın ayarlarını 
            değiştirerek çerezleri kabul etmemeyi veya bir çerez yerleştirildiğinde sizi uyarmasını sağlayabilirsiniz. Ayrıca, 
            istediğiniz zaman tarayıcınızın ayarlarından önceden yerleştirilen çerezleri silebilirsiniz.
          </p>
          <p className="mt-2">
            Çerezleri devre dışı bırakmak veya reddetmek, web sitemizdeki bazı özelliklere erişiminizi engelleyebilir 
            veya web sitesi deneyiminizi olumsuz etkileyebilir.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Tarayıcı Ayarları</h2>
          <p>
            Farklı web tarayıcıları çerezleri yönetmek için farklı yöntemler kullanır. Aşağıda popüler tarayıcılarda çerezleri 
            nasıl kontrol edebileceğiniz hakkında bilgi bulabilirsiniz:
          </p>
          <ul className="list-disc pl-5 mt-2 mb-4">
            <li><strong>Google Chrome:</strong> Menü &gt; Ayarlar &gt; Gelişmiş &gt; Gizlilik ve Güvenlik &gt; Site Ayarları &gt; Çerezler ve site verileri</li>
            <li><strong>Mozilla Firefox:</strong> Menü &gt; Seçenekler &gt; Gizlilik ve Güvenlik &gt; Çerezler ve Site Verileri</li>
            <li><strong>Safari:</strong> Tercihler &gt; Gizlilik &gt; Çerezler ve Web Sitesi Verileri</li>
            <li><strong>Microsoft Edge:</strong> Menü &gt; Ayarlar &gt; Gizlilik, arama ve hizmetler &gt; İzleme Önleme</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Çerez Politikasında Değişiklikler</h2>
          <p>
            Bu Çerez Politikasını herhangi bir zamanda güncelleme hakkını saklı tutarız. Değişiklikler yapıldığında, 
            güncelleme tarihini değiştirerek ve gerektiğinde platformumuzda bildirimde bulunarak sizi bilgilendiririz.
          </p>
          <p className="mt-2">
            Bu çerez politikasını düzenli olarak incelemenizi öneririz.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. İzin ve Onay</h2>
          <p>
            Web sitemizi kullanarak, bu Çerez Politikasında açıklanan şekilde çerezlerin kullanımını kabul etmiş olursunuz. 
            Çerezlerin kullanımını kabul etmiyorsanız, tarayıcı ayarlarınızı buna göre ayarlamanız veya sitemizi kullanmaktan 
            kaçınmanız gerekmektedir.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. İletişim</h2>
          <p>
            Bu Çerez Politikası hakkında sorularınız veya görüşleriniz varsa, lütfen bizimle 
            <a href="mailto:iletisim@topluluk.example.com" className="text-primary hover:underline ml-1">
              iletisim@topluluk.example.com
            </a> adresinden iletişime geçmekten çekinmeyin.
          </p>
        </section>
      </div>
    </div>
  )
}
