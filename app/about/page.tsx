"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Staff } from "@/components/Community/staff";
import { TeamMembers } from "@/components/Community/teamMembers";

export default function AboutPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight">Hakkımızda</h1>
        <p className="text-xl text-muted-foreground mt-4 max-w-3xl mx-auto">
          Türkiye'nin geleceği gençlerle iş dünyasının profesyonellerini bir
          araya getirerek Yapay Zekâ ve gelecek odaklı bir ekosistem inşa
          ediyoruz.
        </p>
      </div>

      <Tabs defaultValue="mission" className="max-w-4xl mx-auto mb-16">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="mission">Misyonumuz</TabsTrigger>
          <TabsTrigger value="vision">Vizyonumuz</TabsTrigger>
          <TabsTrigger value="values">Değerlerimiz</TabsTrigger>
        </TabsList>
        <TabsContent
          value="mission"
          className="p-6 bg-muted/50 rounded-lg mt-2"
        >
          <h3 className="text-2xl font-semibold mb-2">Misyonumuz</h3>
          <p className="text-muted-foreground">
            Atatürk'ün 1930'lu yıllarda başlattığı, "Türkiye'nin Kıvılcımları"
            olmalarını beklediği genç yeteneklerin bugünkü akranlarının,
            ülkemizin ihtiyaç duyacağı ve dünyada öncü olmamızı sağlayacak
            çalışmalarının önünü açmaya destek olmaktır.
          </p>
        </TabsContent>
        <TabsContent value="vision" className="p-6 bg-muted/50 rounded-lg mt-2">
          <h3 className="text-2xl font-semibold mb-2">Vizyonumuz</h3>
          <p className="text-muted-foreground">
            Gençler ve Profesyoneller ile birlikte oluşturduğumuz ekosistem ağı
            içinde kişilerin tanışmalarını, haberleşmelerini ve dünya ile
            rekabet edecek işler üretmelerini hedeflemekteyiz.
          </p>
        </TabsContent>
        <TabsContent value="values" className="p-6 bg-muted/50 rounded-lg mt-2">
          <h3 className="text-2xl font-semibold mb-4">Değerlerimiz</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-background/60 p-4 rounded-lg">
              <h4 className="font-semibold text-lg mb-2">İnovasyon</h4>
              <p className="text-muted-foreground">
                Yenilikçi düşünce ve çözümler üreterek, geleceğin ihtiyaçlarına
                yanıt verme becerisini artırmayı hedefliyoruz.
              </p>
            </div>

            <div className="bg-background/60 p-4 rounded-lg">
              <h4 className="font-semibold text-lg mb-2">İş Birliği</h4>
              <p className="text-muted-foreground">
                Genç yetenekler ve profesyoneller arasında iş birliği yaparak,
                sinerji yaratmayı ve ortak projeler geliştirmeyi önemsiyoruz.
              </p>
            </div>

            <div className="bg-background/60 p-4 rounded-lg">
              <h4 className="font-semibold text-lg mb-2">Gelişim</h4>
              <p className="text-muted-foreground">
                Sürekli öğrenme ve gelişimi teşvik ederek, bireylerin
                potansiyelini en üst seviyeye çıkarmalarını sağlıyoruz.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Separator className="my-12" />

      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-10">
          Yönetim Ekibimiz
        </h2>
        <Staff />
      </div>

      <Separator className="my-12" />

      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-10">
          Topluluk Temsilcilerimiz
        </h2>
        <TeamMembers />
      </div>
    </div>
  );
}
