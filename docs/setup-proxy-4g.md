# 🚀 Setup Proxy 4G Próprio - Guia Completo

## 🛒 **Lista de Compras**

### Hardware Essencial:
- **Roteador 4G:** TP-Link Archer MR200 (R$ 300)
- **Chip Vivo 10GB:** R$ 30/mês
- **Cabo Ethernet** (para configuração inicial)

### Hardware Opcional:
- **Raspberry Pi 4** (R$ 400) - para proxy dedicado
- **Antena externa** (R$ 50) - melhorar sinal

## 🔧 **Configuração do Roteador**

### 1. Configuração Inicial:
```bash
# Acesse o roteador via browser
http://192.168.1.1

# Login padrão:
User: admin
Pass: admin
```

### 2. Configurar APN Vivo:
```
APN: zap.vivo.com.br
Usuário: vivo
Senha: vivo
```

### 3. Configurar Proxy (Squid):
```bash
# SSH no roteador (se suportado)
opkg update
opkg install squid

# Configurar squid.conf
http_port 3128
acl localnet src 192.168.1.0/24
http_access allow localnet
```

## 🐧 **Setup Raspberry Pi (Opcional)**

### 1. Instalar Squid:
```bash
sudo apt update
sudo apt install squid

# Configurar /etc/squid/squid.conf
http_port 3128
acl localnet src 192.168.1.0/24
http_access allow localnet
http_access deny all
```

### 2. Script de Rotação de IP:
```bash
#!/bin/bash
# rotate-ip.sh

# Reinicia conexão 4G a cada 50 simulações
while true; do
  sleep 300  # 5 minutos
  sudo systemctl restart networking
  echo "IP rotacionado: $(curl -s ifconfig.me)"
done
```

## 📊 **Monitoramento de Dados**

### Script de Monitoramento:
```bash
#!/bin/bash
# monitor-data.sh

LIMIT=10240  # 10GB em MB
USED=$(cat /proc/net/dev | grep ppp0 | awk '{print $2}')
USED_MB=$((USED / 1024 / 1024))

echo "Dados usados: ${USED_MB}MB / ${LIMIT}MB"

if [ $USED_MB -gt $LIMIT ]; then
  echo "LIMITE ATINGIDO! Parando simulações..."
  pkill -f "node index.js"
fi
```

## 🎯 **Configuração do Lead Simulator**

### 1. Atualizar config:
```json
{
  "proxyList": ["http://192.168.1.1:3128"],
  "dataMonitoring": {
    "monthlyLimit": 10240,
    "autoStopOnLimit": true
  }
}
```

### 2. Comando para rodar:
```bash
# Com monitoramento de dados
node index.js --config config-4g-proprio.json --num 1850
```

## 💡 **Dicas de Otimização**

### 1. **Horários Ideais:**
- **Madrugada:** Menor congestionamento
- **Fins de semana:** Melhor velocidade

### 2. **Posicionamento da Antena:**
- Próximo à janela
- Direção da torre mais próxima
- Evitar obstáculos metálicos

### 3. **Economia de Dados:**
- Desabilitar imagens: `--disable-images`
- Comprimir tráfego no Squid
- Usar cache local

## 📈 **ROI Esperado**

```
Investimento inicial: R$ 300 (roteador)
Custo mensal: R$ 30 (chip)
Simulações/mês: 1.850
Receita/mês: R$ 74
Lucro/mês: R$ 44
ROI: 147%
Payback: 7 meses
```

## 🚨 **Troubleshooting**

### Problema: IP bloqueado
```bash
# Reiniciar conexão
sudo ifdown ppp0 && sudo ifup ppp0
```

### Problema: Dados acabando rápido
```bash
# Verificar consumo por processo
sudo nethogs
```

### Problema: Velocidade baixa
```bash
# Testar velocidade
speedtest-cli
```

## 🎯 **Próximos Passos**

1. **Comprar hardware** (roteador + chip)
2. **Configurar rede 4G**
3. **Instalar proxy**
4. **Testar com 10 simulações**
5. **Escalar gradualmente**
6. **Monitorar ROI**

**Meta:** R$ 44 de lucro mensal com infraestrutura própria! 🚀