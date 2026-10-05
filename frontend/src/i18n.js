import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  vi: {
    translation: {
      nav: {
        findWork: 'Tìm Việc',
        hireDesigner: 'Thuê Designer',
        forBusinesses: 'Cho Doanh Nghiệp',
        resources: 'Tài Nguyên',
        login: 'Đăng Nhập',
        signup: 'Đăng Ký',
        searchPlaceholder: 'Tìm kiếm tin tuyển dụng, kỹ năng, vị trí...',
        postJob: 'Đăng Tin Mới',
        social: 'Social',
        manageJobs: 'Quản Lý Tin Tuyển Dụng',
        candidates: 'Candidates / Freelancer',
        messages: 'Tin Nhắn',
        companySettings: 'Cài Đặt Công Ty',
      },
      home: {
        searchPlaceholder: 'Bạn đang tìm việc gì? vd: UI/UX Designer, React Developer...',
        searchBtn: 'Tìm Kiếm',
      }
    }
  },
  en: {
    translation: {
      nav: {
        findWork: 'Find Work',
        hireDesigner: 'Hire a Designer',
        forBusinesses: 'For Businesses',
        resources: 'Resources',
        login: 'Log In',
        signup: 'Sign Up',
        searchPlaceholder: 'Search for jobs, skills, locations...',
        postJob: 'Post New Job',
        social: 'Social',
        manageJobs: 'Manage Job Postings',
        candidates: 'Candidates / Freelancers',
        messages: 'Messages',
        companySettings: 'Company Settings',
      },
      home: {
        searchPlaceholder: 'What kind of work are you looking for? e.g. UI/UX Designer...',
        searchBtn: 'Search',
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'vi', // Vietnamese as default
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
