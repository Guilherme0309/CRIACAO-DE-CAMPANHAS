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
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, ativo INTEGER, tipo_perfil TEXT(3))"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS Itens_Pontuacoes (id INTEGER PRIMARY KEY AUTOINCREMENT, Descricao TEXT, Pontos INTEGER, id_Campanha INTEGER, Ativo INTEGER)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS Turmas (id_turma INTEGER PRIMARY KEY AUTOINCREMENT, sigla TEXT, docente TEXT, ativo INTEGER)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS Arrecadacoes (id_arrecadacao INTEGER PRIMARY KEY AUTOINCREMENT, id_campanha INTEGER, id_turma INTEGER, id_Item INTEGER, qtd INTEGER, data TEXT)"
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
  res.redirect("/selectCampanha");
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
    if (err) throw err; //SE OCORRER O ERRO VÁ PARA O RESTO DO CÓDIGO

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

app.get("/perda-conexao", (req, res) => {
  console.log("GET /perda-conexao");
  res.render("pages/perda-conexao", { titulo: "Erro no Servidor Interno" });
});

// Página inicial do admin
app.get("/pagInicialADM", (req, res) => {
  if (req.session.adm) {
    console.log("GET /pagInicialADM");
    res.render("pages/pagInicialADM", {titulo: "Página Inicial ADMIN", req: req});
      
  } else {
    res.redirect("/nao-permitido");
  }
});

// Seleção de campanhas (usuários logados)
app.get("/selectCampanha", (req, res) => {
  if (req.session.loggedin) {
    console.log("GET /selectCampanha");
    const query =
      "SELECT * From Campanhas";
      
    db.all(query, [], (err, row) => {
      if (err) throw err;

        console.log("Campanhas: ", JSON.stringify(row));
        console.log("Req: ", req.session);
        res.render("pages/selectCampanha", {
          titulo: "Selecionar Campanha",
          dados: row,
          req: req,
        });
      
    });
  } else {
    tituloError = "Não Autorizado";
    res.redirect("/nao-autorizado");
  }
});

app.get("/novaCampanha", (req, res) => {
  if (req.session.adm) {
    console.log("GET /novaCampanha");
    const query = "SELECT * FROM Turmas Where ativo = '1' ";

    // Primeiro obtemos os dados de ambas as tabelas
    db.all(query, [], (err, turmas) => {
      if (err) throw err;
        // Só renderizamos a página quando temos todos os dados
        res.render("pages/novaCampanha", {
          titulo: "Nova Campanha",
          req: req,
          turmas: turmas,
        });
      });
  } else {
    tituloError = "Não Autorizado";
    res.redirect("/nao-autorizado");
  }
})

app.post("/novaCampanha", (req, res) => {
  console.log("POST /novaCampanha");
  // Pegar dados da postagem: User ID, Titulo, Conteudo, Data da Postagem
  //req.session.username, req.session.id
  if (req.session.adm) {
    console.log(JSON.stringify(req.body));
    res.redirect("/novaCampanha");
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.get("/tabGeral/:pag", (req, res) => {
  if (req.session.loggedin) {
    console.log("GET /");
    const pag = req.params.pag;
    const query =
      "SELECT Turmas.id_turma, Turmas.sigla, Turmas.docente,Sum(Arrecadacoes.qtd * Pontuacao_Roupas.Pontos) AS totalPontos FROM Turmas INNER JOIN Arrecadacoes ON Turmas.id_turma = Arrecadacoes.id_turma INNER JOIN Pontuacao_Roupas on Arrecadacoes.id_Roupa = Pontuacao_Roupas.id GROUP BY Turmas.id_turma ORDER BY totalPontos DESC";
    const query2 = "SELECT * from Turmas";

    db.all(query, [], (err, row1) => {
      if (err) throw err;

      db.all(query2, [], (err, row2) => {
        if (err) throw err;

        console.log("DADOS: ", JSON.stringify(row1));
        console.log("TURMAS: ", JSON.stringify(row2));
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
    tituloError = "Não Autorizado";
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
    if (orderBy == "data"){
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

app.get("/nova-doacao", (req, res) => {
  if (req.session.adm) {
    const idCampanha = req.params.idCampanha;
    console.log("ID CAMPANHA: " + JSON.stringify(idCampanha));
    console.log("GET /nova-doacao");
    const query =
      "SELECT tc.id_turma, t.sigla, t.docente FROM TurmasCampanhas tc INNER JOIN Turmas t on t.id_turma = tc.id_turma WHERE id_campanha = ? and ativo = 1";
    const query2 =
      "SELECT * FROM Itens_Pontuacoes WHERE id_Campanha = ? and ativo = 1";

    // Primeiro obtemos os dados de ambas as tabelas
    db.all(query, [], (err, turmas) => {
      if (err) throw err;

      db.all(query2, [], (err, pontuacoes) => {
        if (err) throw err;

        // Só renderizamos a página quando temos todos os dados
        res.render("pages/nova-doacao", {
          titulo: "Nova Doação",
          req: req,
          turmas: turmas,
          pontuacoes: pontuacoes,
          idCampanha: idCampanha,
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
    const { id_Campanha, id_turma, id_roupa, qtd } = req.body;
    const query = `INSERT INTO Arrecadacoes (id_campanha, id_turma, id_item, qtd, data) VALUES (?, ?, ? , ?, ?)`;
    const data = new Date();
    const data_atual = data.toLocaleDateString();

    console.log(JSON.stringify(req.body));
    console.log(JSON.stringify(data_atual));

    db.get(query, [id_turma, id_roupa, qtd, data_atual], (err, row) => {
      if (err) throw err; //SE OCORRER O ERRO VÁ PARA O RESTO DO CÓDIGO
      //1. Verificar se o usuário existe
      console.log(JSON.stringify(row));
      res.redirect("/nova-doacao");
    });
  } else {
    res.redirect("/nao-permitido");
  }
});

app.get("/dadosDaTurma/:id", (req, res) => {
  console.log("GET /dadosDaTurma");

  const TurmaId = req.params.id;
  const idCampanha = req.params.idCampanha;
  const query1 =
    "SELECT t.id_turma, t.sigla, t.docente, ip.Descricao, arc.qtd, ip.Pontos, (arc.qtd * ip.Pontos) AS totalPontos FROM Turmas t INNER JOIN Arrecadacoes arc ON arc.id_turma = t.id_turma INNER JOIN Itens_Pontuacoes ip ON ip.id = arc.id_Item WHERE arc.id_campanha = ? AND t.id_turma = ?";
  const query2 = "SELECT * FROM Itens_Pontuacoes WHERE id_Campanha=?";

  db.all(query1, [idCampanha, TurmaId], (err, row) => {
    if (err) throw err;
    db.all(query2, [idCampanha], (err, itens) => {
      if (err) throw err;

        if (row == "") {
          res.status(404);
          res.render("pages/fail", {
            titulo: "ERRO 404",
            req: req,
            msg: "404",
          });
        } else {
          console.log("Roupas : ", JSON.stringify(roupas));
          console.log("Dados: ", JSON.stringify(row));
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

app.get("/nao-autorizado", (req, res) => {
  console.log("GET /nao-autorizado");
  res.render("pages/nao-autorizado", { titulo: "Não Autorizado" });
});

app.get("/pagUsuarios/:pag", (req, res) => {
  if (req.session.adm) {
    console.log("GET /PagUsuarios");
    const pag = req.params.pag;
    const query = `SELECT * FROM users`;

    db.all(query, [], (err, dados) => {
      if (err) throw err;
      console.log(JSON.stringify(dados));
      res.render("pages/PagUsuarios", {
        titulo: "Pagina de Usuarios",
        req: req,
        pag: pag,
        dados: dados,
      });
    });
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.get("/addUsuario", (req, res) => {
  console.log("GET /addUsuario");
  if (req.session.adm) {
    res.render("pages/addUser", {
      titulo: "Adicionar Usuario",
      req: req,
    });
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.get("/pagTurmas/:pag", (req, res) => {
  if (req.session.adm) {
    console.log("GET /PagTurmas");
    const pag = req.params.pag;
    const query = `SELECT * FROM Turmas`;

    db.all(query, [], (err, dados) => {
      if (err) throw err;
      console.log(JSON.stringify(JSON.stringify(dados)));
      res.render("pages/pagTurmas", {
        titulo: "Pagina de Usuarios",
        req: req,
        pag: pag,
        dados: dados,
      });
    });
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
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
