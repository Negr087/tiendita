import { describe, it, expect } from 'vitest';
import { extractPaymentHashFromBolt11 } from '../src/services/lightning';

// Invoice de ejemplo de la spec BOLT #11
const SPEC_INVOICE =
  'lnbc1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq9qrsgq357wnc5r2ueh7ck6q93dj32dlqnls087fxdwk8qakdyafkq3yap9us6v52vjjsrvywa6rt52cm9r9zqt8r2t7mlcwspyetp5h2tztugp9lfyql';

describe('extractPaymentHashFromBolt11', () => {
  it('extrae el payment_hash real del invoice', () => {
    expect(extractPaymentHashFromBolt11(SPEC_INVOICE)).toBe(
      '0001020304050607080900010203040506070809000102030405060708090102',
    );
  });

  it('tira error con un invoice inválido', () => {
    expect(() => extractPaymentHashFromBolt11('lnbc-no-es-un-invoice')).toThrow();
  });
});
