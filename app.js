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
    "CREATE TABLE IF NOT EXISTS Arrecadacoes (id_arrecadacao INTEGER PRIMARY KEY AUTOINCREMENT, id_campanha INTEGER, id_turma INTEGER, id_Item INTEGER, qtd INTEGER, data TEXT)"
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

  const query = `SELECT * FROM users WHERE username=? AND password=? AND ativo= 1`;

  db.get(query, [username, password], (err, row) => {
    if (err) {
      res.redirect("/perda-conexao");
    } //SE OCORRER O ERRO VÁ PARA O RESTO DO CÓDIGO

    //1. Verificar se o usuário existe
    console.log(JSON.stringify(row));
    if (row) {
      //2. Se o usuário existir e a senha é válida no BD, executar o processo de login
      req.session.username = username;
      req.session.loggedin = true;
      req.session.id_user = row.id;
      if (row.tipo_perfil == "ADM") {
        req.session.adm = true;
        res.redirect("/pagInicialADM");
      } else {
        req.session.adm = false;
        res.redirect("/selectCampanha");
      }
    } else {
      //3. Se não, executar processo de negação de login
      res.redirect("/user-senha-invalido");
    }
  });
  // res.render("pages/login")
});

app.get("/pagInicialADM", (req, res) => {
  if (req.session.adm) {
    console.log("GET /pagInicialADM");
    res.render("pages/pagInicialADM", {
      titulo: "Página Inicial ADMIN",
      req: req,
    });
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
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
app.get('/desativarUsuario/:id_username', (req, res) => {
  console.log("GET/desativarUsuario")

  if (req.session.adm) {
    const id_username = req.params.id_username;
    const id_userLogado = req.session.id_user;

    if (id_userLogado == id_username) {
      res.send("Não é Possível Desativar seu Próprio Perfil <a href='/pagUsuarios/1'>Voltar</a>");
    } else {
      const query = 'UPDATE users SET Ativo = 0 WHERE id = ?; '
      var pag = Math.ceil(id_username / 5);
      db.all(query, [id_username], (err, row) => {
        if (err) throw err;
        console.log("usuario desativado");
        res.redirect(`/pagUsuarios/${pag}`);
      })
    }
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.get('/reativarUsuario/:id_username', (req, res) => {
  console.log("GET/reativarUsuario")
  if (req.session.adm) {
    const id_username = req.params.id_username;
    const query = 'UPDATE users SET Ativo = 1 WHERE id = ?; '
    var pag = Math.ceil(id_username / 5);
    db.all(query, [id_username], (err, row) => {
      if (err) throw err;
      res.redirect(`/pagUsuarios/${pag}`);
    })
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
      req: req
    });
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.post("/addUsuario", (req, res) => {
  console.log("POST /addUsuario");
  if (req.session.adm) {
    const { username, password } = req.body;
    console.log(`NOME: ${username}`);
    console.log(`SENHA: ${password}`)

    const query1 = 'SELECT * FROM users WHERE username = ?';
    db.get(query1, [username], (err, row) => {
      if (err) throw err;
      if (row) {
        console.log(row)
        return res.send("Esse nome de usuário já existe <a href='/addUsuario'>Voltar</a>");
      } else {
        const query2 = 'INSERT INTO users (username, password, ativo, tipo_perfil) VALUES (?,?,1,"USR")';
        db.run(query2, [username, password], (err, row) => {
          if (err) throw err; //SE OCORRER O ERRO VÁ PARA O RESTO DO CÓDIGO
          //1. Verificar se o usuário existe
          res.redirect("/pagUsuarios/1");
        })
      }
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

app.get('/desativarturmas/:id_turma', (req, res) => {
  console.log("GET/desativarturmas")
  if (req.session.adm) {
    const id_turma = req.params.id_turma;
    const query = 'UPDATE Turmas SET Ativo = 0 WHERE id_turma = ?; ';
    var pag = Math.ceil(id_turma / 5);
    db.all(query, [id_turma], (err, row) => {
      if (err) throw err;
      console.log("Turma desativada");
      res.redirect(`/pagTurmas/${pag}`);
    })
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.get('/reativarturmas/:id_turma', (req, res) => {
  console.log("GET/reativarturmas")
  if (req.session.adm) {
    const id_turma = req.params.id_turma;
    const query = 'UPDATE Turmas SET Ativo = 1 WHERE id_turma = ?; ';
    var pag = Math.ceil(id_turma / 5);
    db.all(query, [id_turma], (err, row) => {
      if (err) throw err;
      console.log("Turma Ativada");
      res.redirect(`/pagTurmas/${pag}`);
    })
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.get("/addTurma", (req, res) => {
  console.log("GET /addTurma");
  if (req.session.adm) {
    res.render("pages/addTurma", {
      titulo: "Adicionar Turma",
      req: req,
    });
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.post("/addTurma", (req, res) => {
  console.log("POST /addTurma");
  if (req.session.adm) {
    const { sigla, docente } = req.body;
    console.log(`SIGLA: ${sigla}`);
    console.log(`DOCENTE: ${docente}`)
    const query1 = "SELECT * FROM Turmas WHERE sigla = ?"
    db.all(query1, [sigla], (err, row) => {
      if (row) {
        return res.send("Essa nome de Turma já existe <a href='/addTurma'>Voltar</a>");
      } else {
        const query = 'INSERT INTO Turmas (sigla, docente, ativo) VALUES (?,?,1)';
        db.get(query, [sigla, docente], (err, row) => {
          if (err) throw err; //SE OCORRER O ERRO VÁ PARA O RESTO DO CÓDIGO
          //1. Verificar se o usuário existe
          res.redirect("/pagTurmas/1");
        });
      }
    });
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.get("/dashboard", (req, res) => {
  if (req.session.adm) {
    console.log("GET /dashboard");
    res.render("pages/dashboard", { titulo: "Dashboard Campanhas", req: req });
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.get("/selectCampanha", (req, res) => {
  console.log("GET /selectCampanha");
  const query = "SELECT * From Campanhas";

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

app.post("/selectCampanha", (req, res) => {
  console.log("POST /selectCampanha");
  console.log(JSON.stringify(req.body));
  const { selectedCampanha } = req.body; //Pega os dados enviados do Formulario
  console.log("ID Campanha Selecionada: " + JSON.stringify(selectedCampanha));
  if (req.session.loggedin) {
    res.redirect(`/pagInicialCampanha/${selectedCampanha}`);
  } else {
    res.redirect(`/tabGeral/${selectedCampanha}/1`);
  }
});

app.get("/pagInicialCampanha/:idCampanha", (req, res) => {
  const idCampanha = req.params.idCampanha;
  if (req.session.loggedin) {

    const query = "SELECT nome_Campanha, Ativo FROM Campanhas WHERE id_Campanha = ?"
    db.get(query, [idCampanha], (err, row) => {
      if (err) throw err;
      console.log("Dados Campanha: " + JSON.stringify(row))

      res.render("pages/pagInicialCampanha", {
        titulo: "Página da Campanha",
        req: req,
        idCampanha: idCampanha,
        row: row
      });
    });
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
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
});

app.post("/novaCampanha", (req, res) => {
  console.log("POST /novaCampanha");
  // Pegar dados da postagem: User ID, Titulo, Conteudo, Data da Postagem
  //req.session.username, req.session.id
  if (req.session.adm) {
    console.log(JSON.stringify(req.body));

    const { campanhaname, Turmas, ItemName, ItemPontos } = req.body; //Pega os dados enviados do Formulario
    const ativo = 1;

    const query1 = "SELECT * FROM Campanhas WHERE nome_Campanha = ?"

    db.get(query1, [campanhaname], (err, row) => {
      if (err) throw err;

      if (row) {
        res.send("Esse nome de campanha ja existe <a href='/novaCampanha'>Voltar</a>")
      }
      else {
        const query2 = "INSERT INTO Campanhas (nome_Campanha, Ativo) VALUES (?, ?)"; //Insert do Nome da Campanha
        db.run(query2, [campanhaname, ativo], function (err) {
          if (err) throw err;
          const id = this.lastID; // ID do registro recém-criado

          console.log("Campanha criada com ID:", id);

          let query3 = "INSERT INTO TurmasCampanhas (id_campanha, id_turma) VALUES";
          //Insert das Turmas por Campanha
          Turmas.forEach((turma, i) => {
            query3 += `(${id} , ${turma} )`; //Valor de Cada Turma selecionada
            if (i < Turmas.length - 1) query3 += ", ";
          });

          console.log(query3);

          db.run(query2, [], function (err) {
            if (err) throw err;
          });

          let query4 =
            "INSERT INTO Itens_Pontuacoes (Descricao, Pontos, id_Campanha, Ativo) VALUES";
          for (let i = 0; i < ItemName.length; i++) {
            query4 += `( '${ItemName[i]}' , ${ItemPontos[i]}, ${id}, 1)`;
            if (i < ItemName.length - 1) query4 += ", ";
          }
          console.log(query4);

          db.run(query4, [], function (err) {
            if (err) throw err;
          });

          //alert("Campanha Registrada com Sucesso!")
          res.redirect("/selectCampanha");
        });
      }
    })
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.get("/tabGeral/:idCampanha/:pag", (req, res) => {
  console.log("GET /tabGeral");
  const idCampanha = req.params.idCampanha;
  const pag = req.params.pag;
  const query =
    "SELECT t.id_turma, t.sigla, t.docente, arc.qtd, ip.Pontos,COALESCE (Sum(arc.qtd * ip.Pontos), 0) AS totalPontos FROM Turmas t INNER JOIN Arrecadacoes arc ON arc.id_turma = t.id_turma INNER JOIN Itens_Pontuacoes ip ON ip.id = arc.id_Item WHERE arc.id_campanha = ? GROUP BY t.id_turma ORDER BY totalPontos DESC";

  db.all(query, [idCampanha], (err, row1) => {
    if (err) throw err;
    console.log("DADOS: ", JSON.stringify(row1));
    res.render("pages/tabGeral", {
      titulo: "Arrecadações",
      idCampanha: idCampanha,
      dados: row1,
      req: req,
      pag: pag,
    });
  });
});

app.get("/dadosDaTurma/:id/:idCampanha", (req, res) => {
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
        console.log("Itens : ", JSON.stringify(itens));
        console.log("Dados: ", JSON.stringify(row));
        res.render("pages/dadosDaTurma", {
          titulo: "Dados da Turma",
          dados: row,
          itens: itens,
          req: req,
          idCampanha: idCampanha,
        });
      }
    });
  });
});

app.get('/editItens/:id/:pag', (req, res) => {

  console.log("GET/editItens")

  const idCampanha = req.params.id;

  if (req.session.adm) {
    const query2 = "SELECT ativo FROM Campanhas WHERE id_Campanha = ?"
    db.get(query2, [idCampanha], (err, row) => {
      if (err) throw err;
      console.log("Ativo: " + JSON.stringify(row.Ativo));
      if (row.Ativo == 1) {
        const pag = req.params.pag;
        const query = 'SELECT * FROM Itens_Pontuacoes WHERE id_Campanha = ?'
        db.all(query, [idCampanha], (err, itens) => {
          if (err) throw err;
          console.log(JSON.stringify(itens));
          res.render('pages/editItens', { titulo: 'Editar Itens', req: req, pag: pag, idCampanha: idCampanha, dados: itens });
        });
      } else {
        res.send(`Não é possível acessar essa página pois a campannha foi encerrada <a href='/pagInicialCampanha/${idCampanha}'> Voltar </a> `);
      }
    });
  } else {
    tituloError = "Não Autorizado";
    res.redirect("/nao-autorizado");
  }
});


app.get('/addItem/:id', (req, res) => {
  console.log('POST /addItem')

  if (req.session.adm) {
    const idCampanha = req.params.id;
    const query2 = "SELECT ativo FROM Campanhas WHERE id_Campanha = ?"
    db.get(query2, [idCampanha], (err, row) => {
      if (err) throw err;
      console.log("Ativo: " + JSON.stringify(row.Ativo));
      if (row.Ativo == 1) {
        res.render('pages/addItem', { titulo: 'Adicionar Item', req: req, idCampanha: idCampanha });
      } else {
        res.send(`Não é possível acessar essa página pois a campannha foi encerrada <a href='/pagInicialCampanha/${idCampanha}'> Voltar </a> `);
      }
    });
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.post('/addItem/:id', (req, res) => {
  console.log('POST /addItem')
  if (req.session.adm) {
    const idCampanha = req.params.id;
    const { descricao, DdlPontos } = req.body;
    console.log(`Descrição: ${descricao}`);
    console.log(`Pontos: ${DdlPontos}`);
    const query1 = 'SELECT * FROM Itens_Pontuacoes WHERE descricao = ? AND id_Campanha = ?'
    db.all(query1, [descricao, idCampanha], (err, row) => {
      if (row) {
        res.send(`Esse item ja existe <a href="/addItem/${idCampanha}">Voltar</a>`);
      } else {
        const query2 = 'INSERT INTO Itens_Pontuacoes (Descricao, Pontos, id_Campanha, Ativo) VALUES (?,?,?,1)';
        db.get(query2, [descricao, DdlPontos, idCampanha], (err, row) => {
          if (err) throw err; //SE OCORRER O ERRO VÁ PARA O RESTO DO CÓDIGO
          //1. Verificar se o usuário existe
          res.redirect(`/editItens/1/${idCampanha}`);
        })
      }
    })

  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
})


app.get('/desativarItem/:idCampanha/:idItem', (req, res) => {
  console.log("GET/DesativarItem");

  if (req.session.adm) {
    const idCampanha = req.params.idCampanha;
    const idItem = req.params.idItem;

    const query2 = "SELECT ativo FROM Campanhas WHERE id_Campanha = ?";
    db.get(query2, [idCampanha], (err, row) => {
      if (err) throw err;
      console.log("Ativo: " + JSON.stringify(row.Ativo));
      if (row.Ativo == 1) {
        const query = 'UPDATE Itens_Pontuacoes SET Ativo = 0 WHERE id = ?; '
        var pag = Math.ceil(idItem / 5);
        db.all(query, [idItem], (err) => {
          if (err) throw err;
          res.redirect(`/editItens/${idCampanha}/${pag}`);
        });
      } else {
        res.send(`Não é possível desativar itens pois a campanha foi encerrada <a href='/pagInicialCampanha/${idCampanha}'>Voltar</a>`);
      }
    });
  } else {
    res.redirect("/nao-permitido");
  }
});


app.get('/ReativarItem/:idCampanha/:idItem', (req, res) => {
  console.log("GET/ReativarItem");

  if (req.session.adm) {
    const idCampanha = req.params.idCampanha;
    const idItem = req.params.idItem;

    const query2 = "SELECT ativo FROM Campanhas WHERE id_Campanha = ?";
    db.get(query2, [idCampanha], (err, row) => {
      if (err) throw err;

      console.log("Ativo: " + JSON.stringify(row.Ativo));

      if (row.Ativo == 1) {
        const query = 'UPDATE Itens_Pontuacoes SET Ativo = 1 WHERE id = ?; '
        var pag = Math.ceil(idItem / 5);
        db.all(query, [idItem], (err) => {
          if (err) throw err;
          res.redirect(`/editItens/${idCampanha}/${pag}`);
        });
      } else {
        res.send(`Não é possível reativar itens pois a campanha foi encerrada <a href='/pagInicialCampanha/${idCampanha}'>Voltar</a>`);
      }
    });
  } else {
    res.redirect("/nao-permitido");
  }
});



app.get("/nova-doacao/:idCampanha", (req, res) => {
  if (req.session.loggedin) {
    const idCampanha = req.params.idCampanha;

    const queryCheck = "SELECT ativo FROM Campanhas WHERE id_Campanha = ?";
    db.get(queryCheck, [idCampanha], (err, row) => {
      if (err) throw err;

      console.log("Ativo: " + JSON.stringify(row.Ativo));

      if (row.Ativo == 1) {
        console.log("GET /nova-doacao");
        const query = "SELECT t.id_turma, t.sigla, t.docente, tc.id_campanha FROM TurmasCampanhas tc INNER JOIN Turmas t on t.id_turma = tc.id_turma WHERE tc.id_campanha = ? AND t.ativo = 1";

        const query2 = "SELECT * FROM Itens_Pontuacoes WHERE id_Campanha = ? and ativo = 1";

        db.all(query, [idCampanha], (err, turmas) => {
          if (err) throw err;

          db.all(query2, [idCampanha], (err, pontuacoes) => {
            if (err) throw err;
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
        res.send(`Não é possível fazer doações pois a campanha foi encerrada <a href='/pagInicialCampanha/${idCampanha}'>Voltar</a>`);
      }
    });

  } else {
    res.redirect("/nao-permitido");
  }
});


app.post("/nova-doacao", (req, res) => {
  console.log("POST /nova-doacao");
  // Pegar dados da postagem: User ID, Titulo, Conteudo, Data da Postagem
  //req.session.username, req.session.id
  if (req.session.loggedin) {
    const { id_Campanha, id_turma, id_roupa, qtd } = req.body;
    const query = `INSERT INTO Arrecadacoes (id_campanha, id_turma, id_item, qtd, data) VALUES (?, ?, ? , ?, ?)`;
    const data = new Date();
    const data_atual = data.toLocaleDateString();
    console.log(JSON.stringify(req.body));
    console.log(JSON.stringify(data_atual));

    db.get(
      query,
      [id_Campanha, id_turma, id_roupa, qtd, data_atual],
      (err, row) => {
        if (err) throw err; //SE OCORRER O ERRO VÁ PARA O RESTO DO CÓDIGO
        //1. Verificar se o usuário existe
        console.log(JSON.stringify(row));
        res.redirect(`/nova-doacao/${id_Campanha}`);
      }
    );
  } else {
    tituloError = "Não Permitido";
    res.redirect("/nao-permitido");
  }
});

app.get("/encerrarCampanha/:idCampanha", (req, res) => {
  if (req.session.adm) {
    const idCampanha = req.params.idCampanha;
    const query1 = "UPDATE Campanhas SET Ativo = 0 WHERE id_Campanha = ?"
    const query2 = "UPDATE Itens_Pontuacoes SET Ativo = 0 WHERE id_Campanha = ?"
    db.all(query1, [idCampanha], (err1, row1) => {
      if (err1) throw err1;

      db.all(query2, [idCampanha], (err2, row2) => {
        if (err2) throw err2;

        res.redirect(`/pagInicialCampanha/${idCampanha}`);
      })
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

app.get("/user-senha-invalido", (req, res) => {
  res.render("pages/user-senha-invalido", {
    titulo: "Usuario Senha Invalidos",
  });
});

app.get("/perda-conexao", (req, res) => {
  console.log("GET /perda-conexao");
  res.render("pages/perda-conexao", { titulo: "Erro no Servidor Interno" });
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
