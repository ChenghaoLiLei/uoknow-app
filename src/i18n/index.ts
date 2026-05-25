import { I18n } from 'i18n-js';

import zh from './translations/zh';
import zhTW from './translations/zh-TW';
import en from './translations/en';
import ja from './translations/ja';
import ko from './translations/ko';
import es from './translations/es';
import fr from './translations/fr';
import de from './translations/de';
import pt from './translations/pt';
import it from './translations/it';
import ru from './translations/ru';
import ar from './translations/ar';
import hi from './translations/hi';
import th from './translations/th';
import vi from './translations/vi';
import id from './translations/id';
import ms from './translations/ms';
import nl from './translations/nl';
import pl from './translations/pl';
import tr from './translations/tr';
import uk from './translations/uk';
import sv from './translations/sv';
import no from './translations/no';
import da from './translations/da';
import fi from './translations/fi';

const i18n = new I18n({
  zh, 'zh-TW': zhTW, en, ja, ko, es, fr, de, pt, it,
  ru, ar, hi, th, vi, id, ms, nl, pl, tr, uk, sv, no, da, fi,
});

i18n.locale = 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export function setLocale(code: string) {
  i18n.locale = code;
}

export const t = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(key, opts);

export default i18n;
