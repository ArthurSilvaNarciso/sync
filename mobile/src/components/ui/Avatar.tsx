// Avatar com cache em disco (expo-image) — evita o flicker/re-download dos
// avatares ao rolar listas, e cai no avatar padrão quando não há foto.
// Use no lugar do <Image> do react-native para qualquer foto de usuário.
import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Image } from 'expo-image';

const defaultAvatar = require('../../assets/images/default-avatar.png');

type Props = {
  uri?: string | null;
  size?: number;
  /** Estilo extra (ex.: borda). O tamanho/raio já são aplicados. */
  style?: StyleProp<ViewStyle>;
};

function AvatarBase({ uri, size = 44, style }: Props) {
  return (
    <Image
      source={uri ? { uri } : defaultAvatar}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style as any]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
      placeholder={defaultAvatar}
    />
  );
}

// Memo: o avatar só re-renderiza se a URL/tamanho mudarem — importante em listas.
export default React.memo(AvatarBase);
