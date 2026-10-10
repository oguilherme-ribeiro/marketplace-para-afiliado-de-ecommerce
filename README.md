# Achados Shopee

Vitrine de produtos afiliados de e-commerce, incluindo Shopee e Mercado Livre, com catálogo servido pelo backend, painel administrativo autenticado e registro de cliques nos links de afiliado.

> [!IMPORTANT]
> **`database.json` é apenas um armazenamento temporário para desenvolvimento local. Ele não substitui um banco de dados de produção.** Antes de publicar o site ou aceitar tráfego real, configure um banco persistente, como MongoDB Atlas. O arquivo JSON fica no disco de uma única máquina, não oferece transações nem coordenação entre várias instâncias e pode causar perda ou inconsistência de dados em reinicializações, falhas ou gravações concorrentes. Ele também não deve ser usado como backup.

## Funcionalidades

- Vitrine responsiva com busca, filtro por categoria e ordenação por preço ou nome.
- Destaque, imagem, descrição e preço dos produtos carregados da API.
- Redirecionamento para o link de afiliado com incremento de cliques.
- Login administrativo com token JWT e senha armazenada com hash bcrypt.
- Painel para adicionar, editar e excluir produtos e consultar cliques.
- Persistência local temporária em JSON ou persistência de dados em MongoDB.

## Estrutura

```text
.
├── database.json                 # Dados locais de desenvolvimento; ignorado pelo Git
├── frontend/
│   ├── index.html                # Vitrine pública
│   ├── app.js                    # Busca, filtros e renderização do catálogo
│   ├── admin.html                # Painel administrativo
│   ├── admin.js                  # Login, cadastro, edição e exclusão
│   └── marketplace.css           # Estilos da vitrine e do painel
└── backend/
    ├── server.js                 # Express, arquivos estáticos e rotas da API
    ├── .env.example              # Exemplo de configuração; não contém credenciais válidas
    ├── scripts/createAdmin.js    # Criação do primeiro administrador
    └── src/
        ├── database.js           # Adaptador JSON/MongoDB
        ├── controllers/          # Regras HTTP
        ├── middleware/           # Verificação do JWT
        ├── models/               # Schemas MongoDB
        └── routers/               # Rotas da API
```

## Requisitos

- Node.js 20 ou superior.
- npm.
- Para desenvolvimento temporário: acesso de escrita à pasta do projeto.
- Para produção: uma instância de banco de dados persistente e uma chave JWT segura.

## Executar localmente

No PowerShell, a partir da pasta do projeto:

```powershell
Set-Location .\backend
npm install
Copy-Item .env.example .env
```

Edite `backend/.env` e configure pelo menos estas variáveis para o modo local:

```dotenv
DATABASE_FILE=../database.json
PORT=8000
JWT_SECRET=COLOQUE_AQUI_UMA_CHAVE_ALEATORIA_FORTE
ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ESCOLHA_UMA_SENHA_COM_PELO_MENOS_12_CARACTERES
```

Gere uma chave JWT forte com Node.js:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Copie o resultado para `JWT_SECRET`. Não publique essa chave, senhas nem o arquivo `.env`.

O arquivo `database.json` da raiz é criado ou inicializado pelo backend, se ainda não existir. Para iniciar o servidor:

```powershell
npm start
```

A aplicação fica disponível em:

- Vitrine: <http://localhost:8000/>
- Painel administrativo: <http://localhost:8000/admin.html>

### Criar o primeiro administrador

Com `DATABASE_FILE`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` configurados no `.env`, execute em `backend/`:

```powershell
npm run admin:create
```

A senha deve ter pelo menos 12 caracteres e é salva com bcrypt. O comando não cria uma conta duplicada se o e-mail já existir. Acesse o painel com o e-mail e a senha configurados.

## Adicionar e gerenciar produtos

Entre no painel e preencha nome, descrição, preço, categoria, URL da imagem e link de afiliado. Imagem e link de afiliado precisam ser endereços absolutos públicos com `http://` ou `https://`; o campo de imagem não recebe arquivo do computador.

A lista do painel permite editar um produto pelo formulário existente e excluí-lo após confirmação. A vitrine pública não recebe a contagem de cliques; essa métrica fica restrita à rota autenticada do painel.

Cada produto possui estes campos:

| Campo | Tipo | Uso |
| --- | --- | --- |
| `Nome` | Texto | Nome exibido na vitrine |
| `Descricao` | Texto | Descrição curta do produto |
| `Preco` | Número | Preço em reais, maior que zero |
| `Imagem` | URL | Endereço público HTTP/HTTPS de uma imagem |
| `Categoria` | Texto | Categoria usada no filtro |
| `Link` | URL | Link de afiliado HTTP/HTTPS |
| `Cliques` | Número | Contador interno atualizado pelo redirecionamento |

## API

Todas as rotas usam a origem do backend, por exemplo `http://localhost:8000`.

| Método | Rota | Autenticação | Descrição |
| --- | --- | --- | --- |
| `POST` | `/api/admin/login` | Não | Valida credenciais e retorna JWT válido por 8 horas |
| `GET` | `/api/products` | Não | Lista produtos sem expor contagens de cliques |
| `GET` | `/api/products/:id/click` | Não | Soma um clique e redireciona ao link de afiliado |
| `GET` | `/api/products/admin` | Bearer JWT | Lista produtos incluindo cliques |
| `POST` | `/api/products` | Bearer JWT | Cria um produto |
| `PUT` | `/api/products/:id` | Bearer JWT | Atualiza um produto |
| `DELETE` | `/api/products/:id` | Bearer JWT | Exclui um produto |
| `POST` | `/api/admin/user` | Bearer JWT | Cria outro administrador |
| `GET` | `/api/admin/user` | Bearer JWT | Lista administradores sem senhas |
| `DELETE` | `/api/admin/user/:id` | Bearer JWT | Exclui um administrador |

Envie o token retornado pelo login no cabeçalho das rotas protegidas:

```http
Authorization: Bearer <token>
```

Exemplo do corpo de criação de produto:

```json
{
  "Nome": "Fone Bluetooth",
  "Descricao": "Fone sem fio com estojo de carregamento.",
  "Preco": 79.9,
  "Imagem": "https://exemplo.com/imagens/fone.jpg",
  "Categoria": "Eletrônicos",
  "Link": "https://s.shopee.com.br/seu-link-de-afiliado"
}
```

## Banco de dados

### Modo local temporário

Quando `DATABASE_FILE` está definido, ele tem precedência e o backend lê e grava o JSON indicado. Caminhos relativos são resolvidos a partir de `backend/`; por isso `../database.json` aponta para o arquivo na raiz do projeto.

Esse modo é útil para prototipagem local, demonstrações e testes manuais. Não é adequado para:

- Hospedagem ou produção com dados reais.
- Mais de uma instância do servidor.
- Vários processos gravando simultaneamente.
- Disponibilidade, recuperação e backup confiáveis.
- Crescimento do catálogo ou métricas de tráfego.

O arquivo contém dados de produtos e hashes de senha. Está excluído do Git por `.gitignore`; mantenha essa proteção e não o envie por e-mail, repositório ou serviço público.

### Banco persistente para produção

Para usar MongoDB, remova `DATABASE_FILE` do `.env` e configure `MONGO_URI` com a string de conexão do seu banco. Por exemplo:

```dotenv
MONGO_URI=mongodb+srv://USUARIO:SENHA@CLUSTER.mongodb.net/achados_shopee
PORT=8000
JWT_SECRET=UMA_CHAVE_ALEATORIA_FORTE
```

Use as credenciais de menor privilégio necessárias, mantenha o banco acessível apenas pelos endereços autorizados e armazene `MONGO_URI` em um gerenciador de segredos na hospedagem. Não coloque credenciais reais no código, na documentação ou no Git.

A troca do modo JSON para MongoDB não migra automaticamente os registros. Exporte/import os produtos e administradores por um procedimento de migração controlado antes de mudar o ambiente. Teste a cópia em staging e confira produtos, hashes de senha e contadores de cliques antes de apontar a aplicação para o novo banco.

### Antes de publicar em produção

- Configure banco persistente, backups automáticos e um processo de restauração testado.
- Gere e armazene `JWT_SECRET` fora do repositório; nunca use um valor de exemplo.
- Use senhas fortes, TLS/HTTPS e restrinja quem pode acessar o painel.
- Revise CORS para permitir somente os domínios da aplicação.
- Revise as opções TLS de MongoDB: não desative validação de certificados em produção.
- Configure logs e monitoramento sem registrar senhas, tokens ou strings de conexão.
- Teste o cadastro, a edição, a exclusão e os redirecionamentos no ambiente de staging.

## Diagnóstico

- **API retorna `503`:** verifique se o arquivo JSON configurado existe e é JSON válido, ou se `MONGO_URI` está correta e alcançável.
- **Login não funciona:** confirme `JWT_SECRET`, confira se o administrador existe no banco selecionado e crie a conta inicial com `npm run admin:create`.
- **Cadastro de produto retorna `401`:** entre novamente no painel para renovar o token.
- **Imagem recusada:** use uma URL direta e pública iniciada por `https://` ou `http://`; caminhos locais e páginas de produto não são URLs de imagem.
- **Produto não aparece na vitrine:** confira a resposta de `GET /api/products`, a URL de imagem e a categoria selecionada.

## Testes

O pacote ainda não possui uma suíte automatizada (`npm test` é apenas um placeholder). Antes de alterações em autenticação, persistência ou rotas, valide manualmente login, CRUD autenticado, contagem de cliques e comportamento sem token.
