# Login com Google — como ativar

O backend e o app já estão prontos. O login com Google fica **desligado** até você
fazer 2 coisas (uma vez só). Enquanto não fizer, nada quebra — o botão só não aparece.

## 1. Criar o Client ID no Google Cloud (~10 min)

1. Acesse https://console.cloud.google.com/apis/credentials
2. **Criar credenciais → ID do cliente OAuth**.
3. Crie um **Web application** (e, se for buildar app nativo, um para Android e um para iOS).
4. Em "Origens JavaScript autorizadas" (Web), adicione a URL do app (ex.: a do Vercel) e `http://localhost:8081`.
5. Copie o **Client ID** (algo como `1234-xxxx.apps.googleusercontent.com`).

## 2. Configurar o backend (Railway)

No Railway → projeto do backend → **Variables**, adicione:

```
GOOGLE_CLIENT_ID=SEU_CLIENT_ID_AQUI.apps.googleusercontent.com
```

(Se tiver mais de um — web + android + ios — use `GOOGLE_CLIENT_IDS=id1,id2,id3`.)

O Railway redeploya sozinho. Pronto: o endpoint `POST /auth/google` passa a validar
o token de verdade, criar/logar o usuário e devolver a sessão.

## 3. Ligar o botão no app

Instale a lib (uma vez):

```
cd mobile
npx expo install expo-auth-session expo-web-browser expo-crypto
```

No `src/screens/Auth/LoginScreen.tsx` (e/ou Register), adicione:

```tsx
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '../../store/authStore';
WebBrowser.maybeCompleteAuthSession();

// dentro do componente:
const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
  clientId: 'SEU_CLIENT_ID_WEB.apps.googleusercontent.com',
  // androidClientId / iosClientId se for nativo
});
React.useEffect(() => {
  if (response?.type === 'success' && response.params.id_token) {
    loginWithGoogle(response.params.id_token).catch(() => {});
  }
}, [response]);

// no JSX:
<Button title="Continuar com Google" onPress={() => promptAsync()} disabled={!request} />
```

A função `authService.googleLogin` e `authStore.loginWithGoogle` já existem e já
fazem todo o resto (chamar o backend, salvar a sessão, entrar no app).
