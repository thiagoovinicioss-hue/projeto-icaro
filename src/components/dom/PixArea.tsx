import { project } from '../../data/project'
import { isPlaceholder } from '../../utils/placeholders'
import { pixCopyValue } from '../../utils/pix'
import { CopyPixButton } from './CopyPixButton'
import { QrPix } from './QrPix'
import { ShareButton } from './ShareButton'

export function PixArea() {
  const pix = project.pix
  const keyPending = isPlaceholder(pix.key)
  const beneficiaryPending = isPlaceholder(pix.beneficiary)

  return (
    <div className="pix-area">
      <div className="pix-area__inner">
        <QrPix payload={pix.payload} pending={keyPending} />

        <div className="pix-key">
          <span className="pix-key__label">CHAVE PIX {beneficiaryPending ? '' : `· ${pix.beneficiary}`}</span>
          {keyPending ? (
            <span className="pending-content">Chave Pix a publicar</span>
          ) : (
            <>
              <code className="pix-key__code">{pix.key}</code>
              <div className="pix-key__actions">
                <CopyPixButton
                  label="COPIAR CHAVE PIX"
                  doneLabel="Chave copiada."
                  value={pixCopyValue(pix.payload, pix.key)}
                />
                <ShareButton label="COMPARTILHAR" />
              </div>
            </>
          )}
          {!beneficiaryPending && (
            <p className="pix-key__note">
              O valor vai direto para a conta de {pix.beneficiary}, o beneficiário do Projeto Ícaro.
            </p>
          )}
          <p className="pix-key__hint">
            Ficou com dúvidas? Escreva para{' '}
            {isPlaceholder(project.contact.email) ? (
              <span className="pending-content">o contato do projeto</span>
            ) : (
              <a href={`mailto:${project.contact.email}`}>{project.contact.email}</a>
            )}
            .
          </p>
        </div>
      </div>
    </div>
  )
}