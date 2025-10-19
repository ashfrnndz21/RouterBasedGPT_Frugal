import { useLanguage } from '@/lib/contexts/LanguageContext';

export const useTranslation = () => {
  const { t, language, direction } = useLanguage();
  
  return {
    t,
    language,
    direction,
  };
};

export default useTranslation;
