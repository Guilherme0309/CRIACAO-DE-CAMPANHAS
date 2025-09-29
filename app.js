// Importação de bibliotecas necessárias
const express = require("express"); // Framework para servidor web
const session = require("express-session"); // Controle de sessão (login, autenticação)
const sqlite3 = require("sqlite3"); // Banco de dados SQLite


const app = express(); // Criação da aplicação Express
const PORT = 8000; // Porta do servidor

// ==================== BANCO DE DADOS ====================
const db = new sqlite3.Database("dataBase.db"); // Conexão com o banco
db.serialize(() => {
  // Criação das tabelas, caso não existam
  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, cpf INTEGER(11), password TEXT, ativo INTEGER, tipo_perfil TEXT(3))"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS Itens_Pontuacoes (id INTEGER PRIMARY KEY AUTOINCREMENT, Descricao TEXT, Pontos INTEGER, id_Campanha INTEGER, Ativo INTEGER)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS Turmas (id_turma INTEGER PRIMARY KEY AUTOINCREMENT, sigla TEXT, docente TEXT, ativo INTEGER)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS Arrecadacoes (id_arrecadacao INTEGER PRIMARY KEY AUTOINCREMENT, id_campanha INTEGER, id_turma INTEGER, id_Item, qtd INTEGER, data TEXT)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS Campanhas (id_Campanha INTEGER PRIMARY KEY AUTOINCREMENT, nome_Campanha TEXT, Ativo INTEGER)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS TurmasCampanhas (id INTEGER PRIMARY KEY AUTOINCREMENT, id_campanha INTEGER, id_turma INTEGER)"
  );
});

// ==================== CONFIGURAÇÕES DO EXPRESS ====================

// Configuração da sessão
app.use(
  session({
    secret: "senhaforte", // Chave secreta para assinar sessão
    resave: true, // Salvar sessão mesmo que não alterada
    saveUninitialized: true, // Criar sessão mesmo sem dados
  })
);

// Pasta de arquivos estáticos (CSS, JS, imagens)
app.use("/static", express.static(__dirname + "/static"));

// Configuração para receber dados de formulários (POST)
app.use(express.urlencoded({ extended: true })); // Express >= 5

// Motor de templates (EJS)
app.set("view engine", "ejs");

// ==================== ROTAS PRINCIPAIS ====================

// Rota inicial → redireciona para login
app.get("/", (req, res) => {
  res.redirect("/login");
});

// Página de login (formulário)
app.get("/login", (req, res) => {
  console.log("GET /login");
  res.render("pages/login", { titulo: "Login" });
});

// Processamento do login
app.post("/login", (req, res) => {
  console.log("POST /login");
  console.log(JSON.stringify(req.body));
  const { username, password } = req.body;

  const query = `SELECT * FROM users WHERE username=? AND password=?`;

  // Busca usuário no banco
  db.get(query, [username, password], (err, row) => {
    if (err) throw err;

    console.log(JSON.stringify(row));
    if (row) {
      // Usuário encontrado → cria sessão
      req.session.username = username;
      req.session.loggedin = true;
      req.session.id_username = row.id;

      // Se for admin → vai para página de admin
      if (row.tipo_perfil == "ADM") {
        req.session.adm = true;
        res.redirect("/pagInicialADM");
      } else {
        req.session.adm = false;
        res.redirect("/tabGeral/1");
      }
    } else {
      // Usuário ou senha inválidos
      res.redirect("/user-senha-invalido");
    }
  });
});

// Página para login inválido
app.get("/user-senha-invalido", (req, res) => {
  res.render("pages/user-senha-invalido", {
    titulo: "Usuario Senha Invalidos",
  });
});

// Página inicial do admin
app.get("/pagInicialADM", (req, res) => {
  if (req.session.adm) {
    console.log("GET /pagInicialADM");
    res.render("pages/pagInicialADM", { titulo: "Página Inicial ADMIN", req: req });
  } else {
    res.redirect("/nao-permitido");
  }
});

// Seleção de campanhas (usuários logados)
app.get("/selectCampanha", (req, res) => {
  if (req.session.loggedin) {
    console.log("GET /selectCampanha");
    const query = "SELECT * From Campanhas";

    db.all(query, [], (err, row) => {
      if (err) throw err;

      res.render("pages/selectCampanha", {
        titulo: "Selecionar Campanha",
        dados: row,
        req: req,
      });
    });
  } else {
    res.redirect("/nao-autorizado");
  }
});

// Criar nova campanha (admin)
app.get("/novaCampanha", (req, res) => {
  if (req.session.adm) {
    console.log("GET /novaCampanha");
    const query = "SELECT * FROM Turmas Where ativo = '1' ";

    db.all(query, [], (err, turmas) => {
      if (err) throw err;
      res.render("pages/novaCampanha", {
        titulo: "Nova Campanha",
        req: req,
        turmas: turmas,
      });
    });
  } else {
    res.redirect("/nao-autorizado");
  }
});

// Processar criação de campanha (ainda não salva no banco)
app.post("/novaCampanha", (req, res) => {
  console.log("POST /novaCampanha");
  if (req.session.adm) {
    console.log(JSON.stringify(req.body));
    res.redirect("/novaCampanha");
  } else {
    res.redirect("/nao-permitido");
  }
});

// Ranking geral de turmas
app.get("/tabGeral/:pag", (req, res) => {
  if (req.session.loggedin) {
    console.log("GET /");
    const pag = req.params.pag;

    const query =
      "SELECT Turmas.id_turma, Turmas.sigla, Turmas.docente, Sum(Arrecadacoes.qtd * Pontuacao_Roupas.Pontos) AS totalPontos FROM Turmas INNER JOIN Arrecadacoes ON Turmas.id_turma = Arrecadacoes.id_turma INNER JOIN Pontuacao_Roupas on Arrecadacoes.id_Roupa = Pontuacao_Roupas.id GROUP BY Turmas.id_turma ORDER BY totalPontos DESC";
    const query2 = "SELECT * from Turmas";

    db.all(query, [], (err, row1) => {
      if (err) throw err;
      db.all(query2, [], (err, row2) => {
        if (err) throw err;
        res.render("pages/index", {
          titulo: "Arrecadações",
          dados: row1,
          turmas: row2,
          req: req,
          pag: pag,
        });
      });
    });
  } else {
    res.redirect("/nao-autorizado");
  }
});

// Listagem de arrecadações
app.get("/arrecadacoes/:pag", (req, res) => {
  if (req.session.loggedin) {
    console.log("GET /arrecadacoes");
    const pag = req.params.pag;
    const orderBy = req.query.orderBy;
    let query =
      "SELECT id_arrecadacao, Turmas.sigla, Pontuacao_Roupas.Descricao, Pontuacao_Roupas.Pontos, qtd, data FROM Arrecadacoes INNER JOIN Turmas ON Arrecadacoes.id_turma = Turmas.id_turma INNER JOIN Pontuacao_Roupas ON Arrecadacoes.id_roupa = Pontuacao_Roupas.id ORDER BY ";

    // Ordenação dinâmica
    if (orderBy == "data") {
      query += " Arrecadacoes.id_arrecadacao DESC";
    } else if (orderBy == "sala") {
      query += " Arrecadacoes.id_turma";
    } else {
      query += " Arrecadacoes.id_turma";
    }

    db.all(query, [], (err, row) => {
      if (err) throw err;
      res.render("pages/arrecadacoes", {
        titulo: "Arrecadações",
        dados: row,
        req: req,
        pag: pag,
        orderBy: orderBy,
      });
    });
  } else {
    res.redirect("/nao-autorizado");
  }
});

// Formulário de nova doação (apenas admin)
app.get("/nova-doacao", (req, res) => {
  if (req.session.adm) {
    console.log("GET /nova-doacao");
    const query = "SELECT * FROM Turmas";
    const query2 = "SELECT * FROM Pontuacao_Roupas";

    db.all(query, [], (err, turmas) => {
      if (err) throw err;
      db.all(query2, [], (err, pontuacoes) => {
        if (err) throw err;
        res.render("pages/nova-doacao", {
          titulo: "Nova Doação",
          req: req,
          turmas: turmas,
          pontuacoes: pontuacoes,
        });
      });
    });
  } else {
    res.redirect("/nao-permitido");
  }
});

// Processar nova doação
app.post("/nova-doacao", (req, res) => {
  console.log("POST /nova-doacao");
  if (req.session.adm) {
    const { id_turma, id_roupa, qtd } = req.body;
    const query = `INSERT INTO Arrecadacoes (id_turma, id_roupa, qtd, data) VALUES (?, ? , ?, ?)`;
    const data = new Date();
    const data_atual = data.toLocaleDateString();

    console.log(JSON.stringify(req.body));
    console.log(JSON.stringify(data_atual));

    db.get(query, [id_turma, id_roupa, qtd, data_atual], (err, row) => {
      if (err) throw err;
      res.redirect("/nova-doacao");
    });
  } else {
    res.redirect("/nao-permitido");
  }
});

// Detalhes de uma turma
app.get("/dadosDaTurma/:id", (req, res) => {
  console.log("GET /dadosDaTurma");

  if (req.session.loggedin) {
    const TurmaId = req.params.id;
    const query1 =
      "SELECT Turmas.id_turma, Turmas.sigla, Turmas.docente, Pontuacao_Roupas.Descricao, Arrecadacoes.qtd, (Arrecadacoes.qtd * Pontuacao_Roupas.Pontos) AS Pontos FROM Turmas INNER JOIN Arrecadacoes ON Turmas.id_turma = Arrecadacoes.id_turma INNER JOIN Pontuacao_Roupas on Arrecadacoes.id_Roupa = Pontuacao_Roupas.id Where Turmas.id_turma = ?";
    const query2 = "SELECT * FROM Pontuacao_Roupas";

    db.all(query1, [TurmaId], (err, row) => {
      if (err) throw err;
      db.all(query2, [], (err, roupas) => {
        if (err) throw err;

        if (row == "") {
          res.status(404);
          res.render("pages/fail", {
            titulo: "ERRO 404",
            req: req,
            msg: "404",
          });
        } else {
          res.render("pages/dadosDaTurma", {
            titulo: "Dados da Turma",
            dados: row,
            roupas: roupas,
            req: req,
          });
        }
      });
    });
  } else {
    res.redirect("/nao-autorizado");
  }
});

// ==================== PÁGINAS DE ERRO ====================

app.get("/nao-autorizado", (req, res) => {
  console.log("GET /nao-autorizado");
  res.render("pages/nao-autorizado", { titulo: "Não Autorizado" });
});

app.get("/nao-permitido", (req, res) => {
  console.log("GET /nao-permitido");
  res.render("pages/nao-permitido", { titulo: "Não Permitido" });
});

// Logout → encerra sessão
app.get("/logout", (req, res) => {
  console.log("GET /logout");
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// Rota genérica para 404
app.use("/{*erro}", (req, res) => {
  res.status(404).render("pages/fail", { titulo: "ERRO 404", req: req, msg: "404" });
});

// ==================== INICIANDO SERVIDOR ====================
app.listen(PORT, () => {
  console.log(`Servidor sendo excexutado na porta ${PORT}`);
  console.log(__dirname + "\\static");
});
