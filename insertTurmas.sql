INSERT INTO Turmas (sigla, docente, ativo) VALUES
('M1A', 'WILLIAM', 1),
('M3A', 'FABIO', 1),
('M3B', 'EPAMINONDAS', 1),
('M1C', 'ROGÉRIO POLETO', 1),
('M3D', 'WALDEMAR', 1),
('M1F', 'ALCINDO', 1),
('M1I', 'BRUNA', 1),
('M1IA', 'LUCAS / GABRIELA', 1),
('M1H', 'IZAIAS', 1),
('T1A', 'LUCIANO', 1),
('T1B', 'DENIS', 1),
('T1C', 'ROGÉRIO POLETO', 1),
('T1D', 'WALDEMAR', 1),
('T1IA', 'MARILIA', 1),
('T1I', 'LUCAS / JOSÉ AUGUSTO', 1),
('T3FA', 'ALEX', 1),
('T2FC', 'FERNANDO', 1),
('T3F', 'VITOR', 1),
('T1FB', 'BRUNO', 1),
('I1F', 'SERGIO', 1),
('I1FA', 'ALEX PENTEADO', 1),
('I1HS', 'MAYCON', 1),
('I1HSB', 'RICARDO', 1),
('I1E', 'JOÃO FLAVIO', 1),
('I2HS', 'ANA', 1),
('N1I', 'MARILIA', 1),
('N3F', 'EVANDRO', 1);

INSERT INTO users (username, password, ativo, tipo_perfil) VALUES
('Admin', 'admin123', 1, 'ADM');

DELETE FROM Campanhas WHERE id_Campanha = 3;

UPDATE users SET Ativo = 1 WHERE id = 1;

UPDATE Itens_Pontuacoes SET Descricao = 'Roupa de Cama' WHERE id = 6;

SELECT t.id_turma, t.sigla, t.docente, arc.qtd, ip.Pontos,COALESCE (Sum(arc.qtd * ip.Pontos), 0) AS totalPontos FROM Turmas t INNER JOIN Arrecadacoes arc ON arc.id_turma = t.id_turma INNER JOIN Itens_Pontuacoes ip ON ip.id = arc.id_Item WHERE arc.id_campanha = ? GROUP BY t.id_turma ORDER BY totalPontos DESC