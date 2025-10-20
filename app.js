//AO INICIAR UM ARQUIVO JS SEMPRE DECLARE UMA VARIAVEL DE SUA BIBLIOTECA
const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3");
// const bodyparser = require("body-parser") //Até a versão 4 é necessario usar esse codigo

const app = express(); //Armazena as chamadas e propriedades da biblioteca EXPRESS

const PORT = 8000;

//Conexão com o Banco de Dados
const db = new sqlite3.Database("dataBase.db");
db.serialize(() => {
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
    "CREATE TABLE IF NOT EXISTS Arrecadacoes (id_arrecadacao INTEGER PRIMARY KEY AUTOINCREMENT, id_campanha INTEGER, id_turma INTEGER, id_Item, qtd INTEGER, data TEXT)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS Campanhas (id_Campanha INTEGER PRIMARY KEY AUTOINCREMENT, nome_Campanha TEXT, Ativo INTEGER)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS TurmasCampanhas (id INTEGER PRIMARY KEY AUTOINCREMENT, id_campanha INTEGER, id_turma INTEGER)"
  );
});

app.use(
  session({
    secret: "senhaforte",
    resave: true,
    saveUninitialized: true,
  })
);

app.use("/static", express.static(__dirname + "/static"));

//Configuração do Express para processar requisições POST com BODY PARAMETERS
app.use(express.urlencoded({ extended: true })); // Versão Express >= 5.x.x

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.redirect("/selectCampanha");
});

app.get("/login", (req, res) => {
  console.log("GET /login");
  res.render("pages/login", { titulo: "Login" });
});

//Rota /login para processamento dos dados do formulário de LOGIN no cliente
app.post("/login", (req, res) => {
  console.log("POST /login");
  console.log(JSON.stringify(req.body));
  const { username, password } = req.body;

  const query = `SELECT * FROM users WHERE username=? AND password=?`;

  db.get(query, [username, password], (err, row) => {
    if (err) {
      res.redirect("/perda-conexao");
    }; //SE OCORRER O ERRO VÁ PARA O RESTO DO CÓDIGO

    //1. Verificar se o usuário existe
    console.log(JSON.stringify(row));
    if (row) {
      //2. Se o usuário existir e a senha é válida no BD, executar o processo de login
      req.session.username = username;
      req.session.loggedin = true;
      req.session.id_username = row.id;
      if (row.tipo_perfil == "ADM") {
        req.session.adm = true;
        res.redirect("/pagInicialADM");
      } else {
        req.session.adm = false;
        res.redirect("/tabGeral/1");
      }
    } else {
      //3. Se não, executar processo de negação de login
      res.redirect("/user-senha-invalido");
    }
  });
  // res.render("pages/login")
});

app.get("/user-senha-invalido", (req, res) => {
  res.render("pages/user-senha-invalido", {
    titulo: "Usuario Senha Invalidos",
  });
});

app.get("/perda-conexao", (req, res) => {
  console.log("GET /perda-conexao");
  res.render("pages/perda-conexao", { titulo: "Erro no Servidor Interno" });
});

app.get("/pagInicialADM", (req, res) => {
  if (req.session.adm) {
    console.log("GET /pagInicialADM");
    res.render("pages/pagInicialADM", {titulo: "Página Inicial ADMIN", req: req});
      
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
})

app.get ("/dashboard", (req,res) => {

 if (req.session.adm) {
    console.log("GET /dashboard");
    res.render("pages/dashboard", {titulo: "Dashboard Campanhas", req: req});
      
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
})

app.get("/selectCampanha", (req, res) => {
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
});

app.post ("/selectCampanha", (req, res) => {
  console.log("POST /selectCampanha");
  console.log(JSON.stringify(req.body));
  const {selectedCampanha} = req.body;//Pega os dados enviados do Formulario
  console.log("ID Campanha Selecionada: " + JSON.stringify(selectedCampanha));
  res.redirect(`/pagInicialCampanha/${selectedCampanha}`);
});

app.get ("/pagInicialCampanha/:idCampanha", (req, res) => {

  const idCampanha = req.params.idCampanha;

  res.render("pages/pagInicialCampanha", {
          titulo: "Página da Campanha",
          req: req,
          idCampanha: idCampanha
        });
});

app.get("/tabGeral/:idCampanha/:pag", (req, res) => {
    console.log("GET /tabGeral");
    const idCampanha = req.params.idCampanha;
    const pag = req.params.pag;
    const query = "SELECT t.id_turma, t.sigla, t.docente, arc.qtd, ip.Pontos,COALESCE (Sum(arc.qtd * ip.Pontos), 0) AS totalPontos FROM Turmas t INNER JOIN Arrecadacoes arc ON arc.id_turma = t.id_turma INNER JOIN Itens_Pontuacoes ip ON ip.id = arc.id_Item WHERE arc.id_campanha = ? GROUP BY t.id_turma";
    const query2 = "SELECT * from Turmas";

    db.all(query, [idCampanha], (err, row1) => {
      if (err) throw err;

      db.all(query2, [], (err, row2) => {
        if (err) throw err;

        console.log("DADOS: ", JSON.stringify(row1));
        //console.log("TURMAS: ", JSON.stringify(row2));
        res.render("pages/tabGeral", {
          titulo: "Arrecadações",
          idCampanha: idCampanha,
          dados: row1,
          turmas: row2,
          req: req,
          pag: pag,
        });
      });
    });
});

app.get("/arrecadacoes/:pag", (req, res) => {
  if (req.session.loggedin) {
    console.log("GET /arrecadacoes");
    const pag = req.params.pag;
    const orderBy = req.query.orderBy;
    console.log(orderBy);
    let query =
      "SELECT id_arrecadacao, Turmas.sigla, Pontuacao_Roupas.Descricao, Pontuacao_Roupas.Pontos, qtd, data FROM Arrecadacoes INNER JOIN Turmas ON Arrecadacoes.id_turma = Turmas.id_turma INNER JOIN Pontuacao_Roupas ON Arrecadacoes.id_roupa = Pontuacao_Roupas.id ORDER BY ";
    if (orderBy == "data"){
      query += " Arrecadacoes.id_arrecadacao DESC";
    } else if (orderBy == "sala"){
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
    tituloError = "Não Autorizado";
    res.redirect("/nao-autorizado");
  }
});

app.get("/nova-doacao/:idCampanha", (req, res) => {
  if (req.session.adm) {
    const idCampanha = req.params.idCampanha;
    console.log("ID CAMPANHA: " + JSON.stringify(idCampanha))
    console.log("GET /nova-doacao");
    const query = "SELECT tc.id_turma, t.sigla, t.docente FROM TurmasCampanhas tc INNER JOIN Turmas t on t.id_turma = tc.id_turma WHERE id_campanha = ? and ativo = 1";
    const query2 = "SELECT * FROM Itens_Pontuacoes WHERE id_Campanha = ? and ativo = 1";

    // Primeiro obtemos os dados de ambas as tabelasv
    db.all(query, [idCampanha], (err, turmas) => {
      if (err) throw err;
      console.log(JSON.stringify(turmas))

      db.all(query2, [idCampanha], (err, pontuacoes) => {
        if (err) throw err;
        console.log(JSON.stringify(pontuacoes))
        // Só renderizamos a página quando temos todos os dados
        res.render("pages/nova-doacao", {
          titulo: "Nova Doação",
          req: req,
          turmas: turmas,
          pontuacoes: pontuacoes,
          idCampanha: idCampanha
        });
      });
    });
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.post("/nova-doacao", (req, res) => {
  console.log("POST /nova-doacao");
  // Pegar dados da postagem: User ID, Titulo, Conteudo, Data da Postagem
  //req.session.username, req.session.id
  if (req.session.adm) {
    const {id_Campanha, id_turma, id_roupa, qtd } = req.body;
    const query = `INSERT INTO Arrecadacoes (id_campanha, id_turma, id_item, qtd, data) VALUES (?, ?, ? , ?, ?)`;
    const data = new Date();
    const data_atual = data.toLocaleDateString();
    console.log(JSON.stringify(req.body));
    console.log(JSON.stringify(data_atual));

    db.get(query, [id_Campanha, id_turma, id_roupa, qtd, data_atual], (err, row) => {
      if (err) throw err; //SE OCORRER O ERRO VÁ PARA O RESTO DO CÓDIGO
      //1. Verificar se o usuário existe
      console.log(JSON.stringify(row));
      res.redirect(`/nova-doacao/${id_Campanha}`);
    });
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.get("/dadosDaTurma/:id/:idCampanha", (req, res) => {
  console.log("GET /dadosDaTurma");

    const TurmaId = req.params.id;
    const idCampanha = req.params.idCampanha;
    const query1 = "SELECT t.id_turma, t.sigla, t.docente, ip.Descricao, arc.qtd, ip.Pontos, (arc.qtd * ip.Pontos) AS totalPontos FROM Turmas t INNER JOIN Arrecadacoes arc ON arc.id_turma = t.id_turma INNER JOIN Itens_Pontuacoes ip ON ip.id = arc.id_Item WHERE arc.id_campanha = ? AND t.id_turma = ?";
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
          console.log("Itens : ", JSON.stringify(itens));
          console.log("Dados: ", JSON.stringify(row));
          res.render("pages/dadosDaTurma", {
            titulo: "Dados da Turma",
            dados: row,
            itens: itens,
            req: req,
            idCampanha: idCampanha
          });
        }
      });
    });
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

    const { campanhaname, Turmas, ItemName, ItemPontos } = req.body;//Pega os dados enviados do Formulario
    const ativo = 1;

    const query1 = "INSERT INTO Campanhas (nome_Campanha, Ativo) VALUES (?, ?)" //Insert do Nome da Campanha
    db.run(query1, [campanhaname, ativo], function(err) {
      if (err) throw err;
      const id = this.lastID; // ID do registro recém-criado

    console.log("Campanha criada com ID:", id);
    
    let query2 = "INSERT INTO TurmasCampanhas (id_campanha, id_turma) VALUES"; 
    //Insert das Turmas por Campanha
    Turmas.forEach((turma, i )=> {
      query2 += `(${id} , ${turma} )`; //Valor de Cada Turma selecionada
      if (i < Turmas.length - 1) query2 += ", ";
    });

    console.log(query2);

    db.run(query2,[], function(err) {
      if (err) throw err;
    });

    let query3 = "INSERT INTO Itens_Pontuacoes (Descricao, Pontos, id_Campanha, Ativo) VALUES";
    for (let i = 0; i < ItemName.length; i++) {
      query3 += `( '${ItemName[i]}' , ${ItemPontos[i]}, ${id}, 1)`;
      if (i < ItemName.length - 1) query3 += ", ";
    }
    console.log(query3);

    db.run(query3,[], function(err){
      if (err) throw err;
    });

    //alert("Campanha Registrada com Sucesso!")
    res.redirect("/selectCampanha");

    });
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.get("/nao-autorizado", (req, res) => {
  console.log("GET /nao-autorizado");
  res.render("pages/nao-autorizado", { titulo: "Não Autorizado" });
});

app.get("/pagUsuarios/:pag", (req, res) => {
  console.log("GET /PagUsuarios");
  const pag = req.params.pag;
  const query = `SELECT * FROM users`;

  db.all(query, [], (err, dados) => {
    if (err) throw err; 
    console.log(JSON.stringify(dados));
    res.render("pages/PagUsuarios", { titulo: "Pagina de Usuarios", req: req, pag: pag, dados:dados });
});
});

app.get("/pagTurmas/:pag", (req, res) => {
  console.log("GET /PagTurmas");
  const pag = req.params.pag;
  const query = `SELECT * FROM Turmas`;

  db.all(query, [], (err, dados) => {
    if (err) throw err; 
    console.log(JSON.stringify(JSON.stringify(dados)));
    res.render("pages/pagTurmas", { titulo: "Pagina de Usuarios", req: req, pag: pag, dados:dados });
});
});



app.get("/nao-permitido", (req, res) => {
  console.log("GET /nao-permitido");
  res.render("pages/nao-permitido", { titulo: "Não Permitido" });
});

app.get("/logout", (req, res) => {
  console.log("GET /logout");
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.use("/{*erro}", (req, res) => {
  // Envia uma resposta de erro 404
  res
    .status(404)
    .render("pages/fail", { titulo: "ERRO 404", req: req, msg: "404" });
});

app.listen(PORT, () => {
  console.log(`Servidor sendo excexutado na porta ${PORT}`);
  console.log(__dirname + "\\static");
});