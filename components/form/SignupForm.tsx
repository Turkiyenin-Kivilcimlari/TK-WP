"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useAuth, RegisterFormData } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CloudflareTurnstile } from "../ui/cloudflare-turnstile";
import { Checkbox } from "@/components/ui/checkbox";

interface SignupFormProps extends React.HTMLAttributes<HTMLDivElement> {
  turnstileToken?: string;
  turnstileVerified?: boolean;
}

interface FormErrors {
  name?: string;
  lastname?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  title?: string; // Title için hata mesajı alanı ekleyelim
}

export function SignupForm({ className, ...props }: SignupFormProps) {
  const { register, isRegistering } = useAuth();

  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    React.useState<boolean>(false);

  const [formValues, setFormValues] = React.useState<RegisterFormData>({
    name: "",
    lastname: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    allowEmails: false,
    title: "", // Title alanını ekleyelim
  });

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [showErrors, setShowErrors] = React.useState<boolean>(false);
  const [isFormValidated, setIsFormValidated] = React.useState<boolean>(false);

  // Turnstile doğrulaması için state'ler
  const [turnstileToken, setTurnstileToken] = React.useState<string>("");
  const [turnstileVerified, setTurnstileVerified] =
    React.useState<boolean>(false);

  // Turnstile doğrulama işleyicisi
  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);
    setTurnstileVerified(true);
  };

  // Turnstile hata işleyicisi
  const handleTurnstileError = () => {
    setTurnstileToken("");
    setTurnstileVerified(false);
  };

  // Doğrulama başarılı olduğunda gösterilecek bileşen
  const renderVerificationSuccess = () => {
    return (
      <div className="flex items-center text-sm text-green-600 mt-2">
        <CheckCircle2 className="h-4 w-4 mr-2" />
        <span>Robot doğrulaması başarılı</span>
      </div>
    );
  };

  React.useEffect(() => {
    if (
      formValues.email ||
      formValues.name ||
      formValues.lastname ||
      formValues.phone ||
      formValues.password ||
      formValues.confirmPassword
    ) {
      validateForm();
    }
  }, [formValues]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    // İsim ve soyad alanlarında sadece harf ve boşluğa izin ver
    if (id === "name" || id === "lastname") {
      // Sayı girilmesini engelle
      if (/\d/.test(value)) {
        // Sayı içeren karakterleri filtreleme, son temiz hali koruma
        const cleanValue = value.replace(/\d/g, "");
        setFormValues((prev) => ({
          ...prev,
          [id]: cleanValue,
        }));
        validateField(id, cleanValue);
        return;
      }
    }

    setFormValues((prev) => ({
      ...prev,
      [id]: value,
    }));

    validateField(id, value);
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormValues((prev) => ({
      ...prev,
      allowEmails: checked,
    }));
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const validChars = value.replace(/[^\d+() ]/g, "");
    const singleSpaces = validChars.replace(/\s+/g, " ");
    let formattedNumber = "";
    let lastCharWasDigit = false;
    let lastCharWasSpace = false;

    for (let i = 0; i < singleSpaces.length; i++) {
      const char = singleSpaces[i];

      if (/\d/.test(char)) {
        formattedNumber += char;
        lastCharWasDigit = true;
        lastCharWasSpace = false;
      } else if (char === " ") {
        if (lastCharWasDigit && !lastCharWasSpace) {
          formattedNumber += char;
          lastCharWasSpace = true;
          lastCharWasDigit = false;
        }
      } else {
        formattedNumber += char;
        lastCharWasDigit = false;
        lastCharWasSpace = false;
      }
    }

    setFormValues((prev) => ({
      ...prev,
      phone: formattedNumber,
    }));

    validateField("phone", formattedNumber);
  };

  const validateField = (fieldName: string, value: string): boolean => {
    const newErrors = { ...errors };

    switch (fieldName) {
      case "name":
        if (!value.trim()) {
          newErrors.name = "Ad alanı zorunludur";
          break;
        }
        if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(value.trim())) {
          newErrors.name = "Ad sadece harf içermelidir, sayı içeremez";
          break;
        }
        if (value.trim().length < 2) {
          newErrors.name = "Ad en az 2 karakter olmalıdır";
          break;
        }
        delete newErrors.name;
        break;

      case "lastname":
        if (!value.trim()) {
          newErrors.lastname = "Soyad alanı zorunludur";
          break;
        }
        if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(value.trim())) {
          newErrors.lastname = "Soyad sadece harf içermelidir, sayı içeremez";
          break;
        }
        if (value.trim().length < 2) {
          newErrors.lastname = "Soyad en az 2 karakter olmalıdır";
          break;
        }
        delete newErrors.lastname;
        break;

      case "title":
        if (value.trim().length > 50) {
          newErrors.title = "Unvan en fazla 50 karakter olabilir";
          break;
        }
        delete newErrors.title;
        break;

      case "phone":
        // Telefon alanı artık zorunlu değil, boşsa hata vermeyelim
        if (!value.trim()) {
          delete newErrors.phone;
          break;
        }
        if (value.replace(/[^\d]/g, "").length < 10) {
          newErrors.phone = "Geçerli bir telefon numarası giriniz";
          break;
        }
        delete newErrors.phone;
        break;

      case "email":
        if (!value.trim()) {
          newErrors.email = "E-posta adresi zorunludur";
          break;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = "Geçerli bir e-posta adresi giriniz";
          break;
        }
        delete newErrors.email;
        break;

      case "password":
        if (!value) {
          newErrors.password = "Şifre zorunludur";
          break;
        }
        if (value.length < 8) {
          newErrors.password = "Şifre en az 8 karakter olmalıdır";
          break;
        }
        if (!/(?=.*[a-z])/.test(value)) {
          newErrors.password = "Şifre en az bir küçük harf içermelidir";
          break;
        }
        if (!/(?=.*[A-Z])/.test(value)) {
          newErrors.password = "Şifre en az bir büyük harf içermelidir";
          break;
        }
        if (!/(?=.*\d)/.test(value)) {
          newErrors.password = "Şifre en az bir rakam içermelidir";
          break;
        }
        if (/[ğüşıöçĞÜŞİÖÇ]/.test(value)) {
          newErrors.password = "Şifre Türkçe karakter içermemelidir";
          break;
        }
        delete newErrors.password;

        if (formValues.confirmPassword) {
          if (value !== formValues.confirmPassword) {
            newErrors.confirmPassword = "Şifreler eşleşmiyor";
          } else {
            delete newErrors.confirmPassword;
          }
        }
        break;

      case "confirmPassword":
        if (!value) {
          newErrors.confirmPassword = "Şifre tekrarı zorunludur";
          break;
        }
        if (value !== formValues.password) {
          newErrors.confirmPassword = "Şifreler eşleşmiyor";
          break;
        }
        delete newErrors.confirmPassword;
        break;
    }

    setErrors(newErrors);

    const isValid =
      Object.keys(newErrors).length === 0 &&
      Boolean(formValues.name) &&
      Boolean(formValues.lastname) &&
      // Telefon zorunlu olmadığı için kontrol etmiyoruz
      Boolean(formValues.email) &&
      Boolean(formValues.password) &&
      Boolean(formValues.confirmPassword);

    setIsFormValidated(isValid);

    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    if (!formValues.name.trim()) {
      newErrors.name = "Ad alanı zorunludur";
    } else if (formValues.name.trim().length < 2) {
      newErrors.name = "Ad en az 2 karakter olmalıdır";
    } else if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(formValues.name.trim())) {
      newErrors.name = "Ad sadece harf içermelidir, sayı içeremez";
    }

    if (!formValues.lastname.trim()) {
      newErrors.lastname = "Soyad alanı zorunludur";
    } else if (formValues.lastname.trim().length < 2) {
      newErrors.lastname = "Soyad en az 2 karakter olmalıdır";
    } else if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(formValues.lastname.trim())) {
      newErrors.lastname = "Soyad sadece harf içermelidir, sayı içeremez";
    }

    // Title validasyonu - title uzunluk kontrolü yapıyoruz ama zorunlu değil
    if (formValues.title && formValues.title.trim().length > 50) {
      newErrors.title = "Unvan en fazla 50 karakter olabilir";
    }

    // Telefon validasyonu - artık zorunlu değil
    if (formValues.phone.trim()) {
      if (formValues.phone.replace(/[^\d]/g, "").length < 10) {
        newErrors.phone = "Geçerli bir telefon numarası giriniz";
      }
    }

    if (!formValues.email.trim()) {
      newErrors.email = "E-posta adresi zorunludur";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      newErrors.email = "Geçerli bir e-posta adresi giriniz";
    }

    if (!formValues.password) {
      newErrors.password = "Şifre zorunludur";
    } else if (formValues.password.length < 8) {
      newErrors.password = "Şifre en az 8 karakter olmalıdır";
    } else if (!/(?=.*[a-z])/.test(formValues.password)) {
      newErrors.password = "Şifre en az bir küçük harf içermelidir";
    } else if (!/(?=.*[A-Z])/.test(formValues.password)) {
      newErrors.password = "Şifre en az bir büyük harf içermelidir";
    } else if (!/(?=.*\d)/.test(formValues.password)) {
      newErrors.password = "Şifre en az bir rakam içermelidir";
    } else if (/[ğüşıöçĞÜŞİÖÇ]/.test(formValues.password)) {
      newErrors.password = "Şifre Türkçe karakter içermemelidir";
    }

    if (!formValues.confirmPassword) {
      newErrors.confirmPassword = "Şifre tekrarı zorunludur";
    } else if (formValues.confirmPassword !== formValues.password) {
      newErrors.confirmPassword = "Şifreler eşleşmiyor";
    }

    setErrors(newErrors);
    setIsFormValidated(Object.keys(newErrors).length === 0);

    return newErrors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setShowErrors(true);

    if (!turnstileVerified && process.env.NODE_ENV !== "development") {
      toast.error("Robot Doğrulama Hatası", {
        description: "Lütfen robot olmadığınızı doğrulayın.",
        position: "top-center",
      });
      return;
    }

    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      toast.error("Form Hatası", {
        description: "Lütfen form alanlarını kontrol ediniz.",
        position: "top-center",
      });
      return;
    }

    try {
      await register({
        ...formValues,
        turnstileToken,
        allowEmails: formValues.allowEmails,
      });
    } catch (error) {
      toast.error("Kayıt Hatası");
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  return (
    <div
      className={cn(
        "grid gap-6 w-full max-w-md mx-auto px-4 sm:px-0",
        className
      )}
      {...props}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-1">
            <Label htmlFor="name" className="flex">
              Ad
              {showErrors && errors.name && (
                <span className="ml-auto text-xs text-destructive font-normal">
                  {errors.name}
                </span>
              )}
            </Label>
            <Input
              id="name"
              placeholder="Adınız"
              type="text"
              autoCapitalize="words"
              autoComplete="given-name"
              disabled={isRegistering}
              value={formValues.name}
              onChange={handleInputChange}
              className={cn(
                showErrors &&
                  errors.name &&
                  "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={showErrors && errors.name ? "true" : "false"}
              aria-describedby={
                showErrors && errors.name ? "name-error" : undefined
              }
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="lastname" className="flex">
              Soyad
              {showErrors && errors.lastname && (
                <span className="ml-auto text-xs text-destructive font-normal">
                  {errors.lastname}
                </span>
              )}
            </Label>
            <Input
              id="lastname"
              placeholder="Soyadınız"
              type="text"
              autoCapitalize="words"
              autoComplete="family-name"
              disabled={isRegistering}
              value={formValues.lastname}
              onChange={handleInputChange}
              className={cn(
                showErrors &&
                  errors.lastname &&
                  "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={showErrors && errors.lastname ? "true" : "false"}
              aria-describedby={
                showErrors && errors.lastname ? "lastname-error" : undefined
              }
            />
          </div>
        </div>

        {/* Title (Unvan) alanı */}
        <div className="grid gap-1">
          <Label htmlFor="title" className="flex">
            Unvan (Opsiyonel)
            {showErrors && errors.title && (
              <span className="ml-auto text-xs text-destructive font-normal">
                {errors.title}
              </span>
            )}
          </Label>
          <Input
            id="title"
            placeholder="Örn: Yazılım Geliştirici, Öğrenci, Öğretmen"
            type="text"
            disabled={isRegistering}
            value={formValues.title}
            onChange={handleInputChange}
            className={cn(
              showErrors &&
                errors.title &&
                "border-destructive focus-visible:ring-destructive"
            )}
            aria-invalid={showErrors && errors.title ? "true" : "false"}
            aria-describedby={
              showErrors && errors.title ? "title-error" : undefined
            }
          />
        </div>

        <div className="grid gap-1">
          <Label htmlFor="phone" className="flex">
            Telefon Numarası (Opsiyonel)
            {showErrors && errors.phone && (
              <span className="ml-auto text-xs text-destructive font-normal">
                {errors.phone}
              </span>
            )}
          </Label>
          <Input
            id="phone"
            placeholder="+90 (5XX) XXX XX XX"
            type="tel"
            autoComplete="tel"
            disabled={isRegistering}
            value={formValues.phone}
            onChange={handlePhoneNumberChange}
            className={cn(
              showErrors &&
                errors.phone &&
                "border-destructive focus-visible:ring-destructive"
            )}
            aria-invalid={showErrors && errors.phone ? "true" : "false"}
            aria-describedby={
              showErrors && errors.phone ? "phone-error" : undefined
            }
          />
        </div>

        <div className="grid gap-1">
          <Label htmlFor="email" className="flex">
            E-posta
            {showErrors && errors.email && (
              <span className="ml-auto text-xs text-destructive font-normal">
                {errors.email}
              </span>
            )}
          </Label>
          <Input
            id="email"
            placeholder="name@example.com"
            type="email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            disabled={isRegistering}
            value={formValues.email}
            onChange={handleInputChange}
            className={cn(
              showErrors &&
                errors.email &&
                "border-destructive focus-visible:ring-destructive"
            )}
            aria-invalid={showErrors && errors.email ? "true" : "false"}
            aria-describedby={
              showErrors && errors.email ? "email-error" : undefined
            }
          />
        </div>

        <div className="grid gap-1">
          <Label htmlFor="password" className="flex">
            Şifre
            {showErrors && errors.password && (
              <span className="ml-auto text-xs text-destructive font-normal">
                {errors.password}
              </span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="password"
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              disabled={isRegistering}
              value={formValues.password}
              onChange={handleInputChange}
              className={cn(
                "pr-10",
                showErrors &&
                  errors.password &&
                  "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={showErrors && errors.password ? "true" : "false"}
              aria-describedby={
                showErrors && errors.password ? "password-error" : undefined
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={handleTogglePasswordVisibility}
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-1">
          <Label htmlFor="confirmPassword" className="flex">
            Şifre Tekrarı
            {showErrors && errors.confirmPassword && (
              <span className="ml-auto text-xs text-destructive font-normal">
                {errors.confirmPassword}
              </span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              placeholder="••••••••"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              disabled={isRegistering}
              value={formValues.confirmPassword}
              onChange={handleInputChange}
              className={cn(
                "pr-10",
                showErrors &&
                  errors.confirmPassword &&
                  "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={
                showErrors && errors.confirmPassword ? "true" : "false"
              }
              aria-describedby={
                showErrors && errors.confirmPassword
                  ? "confirmPassword-error"
                  : undefined
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={handleToggleConfirmPasswordVisibility}
              aria-label={
                showConfirmPassword ? "Şifreyi gizle" : "Şifreyi göster"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* E-posta izni için checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowEmails"
            checked={formValues.allowEmails}
            onCheckedChange={handleCheckboxChange}
            disabled={isRegistering}
          />
          <Label
            htmlFor="allowEmails"
            className="text-sm font-normal leading-none cursor-pointer"
          >
            Bilgilendirme e-postaları almak istiyorum
          </Label>
        </div>

        {/* Cloudflare Turnstile Widget */}
        <div className="">
          <div className="text-sm text-muted-foreground mb-2">
            Lütfen robot olmadığınızı doğrulayın
          </div>
          <CloudflareTurnstile
            onVerify={handleTurnstileVerify}
            onError={handleTurnstileError}
          />
          {turnstileVerified && renderVerificationSuccess()}
        </div>

        <Button
          disabled={
            isRegistering ||
            (!turnstileVerified && process.env.NODE_ENV !== "development")
          }
          type="submit"
          className="w-full"
        >
          {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isRegistering ? "Kayıt olunuyor..." : "Kayıt Ol"}
        </Button>
      </form>
    </div>
  );
}
