import en from './locales/en.json' with {type:'json'};
import it from './locales/it.json' with {type:'json'};
import es from './locales/es.json' with {type:'json'};
import de from './locales/de.json' with {type:'json'};
import fr from './locales/fr.json' with {type:'json'};
import pt from './locales/pt.json' with {type:'json'};
import ru from './locales/ru.json' with {type:'json'};
import zh from './locales/zh.json' with {type:'json'};
import ja from './locales/ja.json' with {type:'json'};
import ko from './locales/ko.json' with {type:'json'};
import ar from './locales/ar.json' with {type:'json'};
import hi from './locales/hi.json' with {type:'json'};
export const strings={en,it,es,de,fr,pt,ru,zh,ja,ko,ar,hi};
export const languages=[{code:'en',name:'English'},{code:'it',name:'Italiano'},{code:'es',name:'Español'},{code:'de',name:'Deutsch'},{code:'fr',name:'Français'},{code:'pt',name:'Português'},{code:'ru',name:'Русский'},{code:'zh',name:'简体中文'},{code:'ja',name:'日本語'},{code:'ko',name:'한국어'},{code:'ar',name:'العربية'},{code:'hi',name:'हिन्दी'}];
export function resolveLanguage(preferred=[]){for(const value of preferred){const base=String(value).replace('_','-').toLowerCase().split('-')[0];if(Object.hasOwn(strings,base))return base}return 'en'}
export function direction(language){return language==='ar'?'rtl':'ltr'}
