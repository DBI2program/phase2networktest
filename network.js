(() => {
  const projects = window.PROJECTS || [];
  const svg = document.getElementById("network");
  const details = document.getElementById("details");
  const search = document.getElementById("search");
  const position = document.getElementById("position");
  const count = document.getElementById("count");
  const projectViewButton = document.getElementById("projectView");
  const peopleViewButton = document.getElementById("peopleView");
  const NS = "http://www.w3.org/2000/svg";

  let viewMode = "projects";
  let drag = null;
  let scale = 1;
  let tx = 0;
  let ty = 0;

  const people = [
    ...new Set(
      projects.flatMap((project) => [
        project.supervisor,
        ...project.collaborators
      ])
    )
  ].sort();

  const personProjectCounts = Object.fromEntries(
    people.map((person) => [
      person,
      projects.filter(
        (project) =>
          project.supervisor === person ||
          project.collaborators.includes(person)
      ).length
    ])
  );

  const nodes = [];
  const projectEdges = [];

  people.forEach((name, index) => {
    const angle = (2 * Math.PI * index) / people.length - Math.PI / 2;

    nodes.push({
      id: `person:${name}`,
      name,
      type: "person",
      degree: personProjectCounts[name],
      x: 600 + 390 * Math.cos(angle),
      y: 380 + 300 * Math.sin(angle),
      vx: 0,
      vy: 0
    });
  });

  projects.forEach((project, index) => {
    const angle = (2 * Math.PI * index) / projects.length - Math.PI / 2;

    const node = {
      ...project,
      id: `project:${project.id}`,
      name: project.title,
      type: "project",
      x: 600 + 210 * Math.cos(angle),
      y: 380 + 175 * Math.sin(angle),
      vx: 0,
      vy: 0
    };

    nodes.push(node);

    projectEdges.push({
      source: node.id,
      target: `person:${project.supervisor}`,
      role: "supervisor",
      projectId: project.id
    });

    project.collaborators.forEach((collaborator) => {
      projectEdges.push({
        source: node.id,
        target: `person:${collaborator}`,
        role: "collaborator",
        projectId: project.id
      });
    });
  });

  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));

  const collaborationMap = new Map();

  projects.forEach((project) => {
    const participants = [
      project.supervisor,
      ...project.collaborators
    ];

    for (let i = 0; i < participants.length; i += 1) {
      for (let j = i + 1; j < participants.length; j += 1) {
        const names = [participants[i], participants[j]].sort();
        const key = names.join("|||");

        if (!collaborationMap.has(key)) {
          collaborationMap.set(key, {
            source: `person:${names[0]}`,
            target: `person:${names[1]}`,
            projects: []
          });
        }

        collaborationMap.get(key).projects.push(project.id);
      }
    }
  });

  const peopleEdges = [...collaborationMap.values()];

  const viewport = document.createElementNS(NS, "g");
  const edgeGroup = document.createElementNS(NS, "g");
  const peopleEdgeGroup = document.createElementNS(NS, "g");
  const nodeGroup = document.createElementNS(NS, "g");

  svg.append(viewport);
  viewport.append(edgeGroup, peopleEdgeGroup, nodeGroup);

  projectEdges.forEach((edge) => {
    const line = document.createElementNS(NS, "line");
    line.classList.add("edge", edge.role);
    edge.el = line;
    edgeGroup.append(line);
  });

  peopleEdges.forEach((edge) => {
    const line = document.createElementNS(NS, "line");
    line.classList.add("edge", "people-edge");
    edge.el = line;
    peopleEdgeGroup.append(line);
  });

  nodes.forEach((node) => {
    const group = document.createElementNS(NS, "g");
    group.classList.add("node");
    group.classList.add(
      node.type === "person" ? "person-node" : "project-node"
    );
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");

    let shape;

    if (node.type === "person") {
      shape = document.createElementNS(NS, "circle");
      const radius = 7.5 + Math.min(7, (node.degree - 1) * 1.5);
      shape.setAttribute("r", String(radius));
      shape.classList.add("person-shape");
    } else {
      shape = document.createElementNS(NS, "rect");
      shape.setAttribute("x", "-8");
      shape.setAttribute("y", "-8");
      shape.setAttribute("width", "16");
      shape.setAttribute("height", "16");
      shape.setAttribute("rx", "3");
      shape.classList.add("project-shape");
    }

    const label = document.createElementNS(NS, "text");
    label.setAttribute("x", node.type === "person" ? "14" : "12");
    label.setAttribute("y", "4");
    label.textContent =
      node.type === "person" ? node.name : `P${node.id.split(":")[1]}`;

    group.append(shape, label);
    node.el = group;
    nodeGroup.append(group);

    group.addEventListener("click", (event) => {
      event.stopPropagation();
      selectNode(node);
    });

    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectNode(node);
      }
    });

    group.addEventListener("pointerdown", (event) => {
      drag = node;
      group.setPointerCapture(event.pointerId);
    });
  });

  function simulate(iterations = 220) {
    const activeNodes =
      viewMode === "projects"
        ? nodes
        : nodes.filter((node) => node.type === "person");

    const activeEdges =
      viewMode === "projects" ? projectEdges : peopleEdges;

    for (let step = 0; step < iterations; step += 1) {
      activeNodes.forEach((node) => {
        node.vx += (600 - node.x) * 0.00022;
        node.vy += (380 - node.y) * 0.00022;
      });

      activeEdges.forEach((edge) => {
        const a = nodeMap[edge.source];
        const b = nodeMap[edge.target];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || 1;

        const target =
          viewMode === "projects"
            ? edge.role === "supervisor"
              ? 105
              : 125
            : 150;

        const force = (distance - target) * 0.00065;

        a.vx += (dx / distance) * force;
        a.vy += (dy / distance) * force;
        b.vx -= (dx / distance) * force;
        b.vy -= (dy / distance) * force;
      });

      for (let i = 0; i < activeNodes.length; i += 1) {
        for (let j = i + 1; j < activeNodes.length; j += 1) {
          const a = activeNodes[i];
          const b = activeNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distanceSquared = dx * dx + dy * dy + 8;
          const repulsion =
            viewMode === "projects" ? 430 / distanceSquared : 760 / distanceSquared;

          a.vx -= dx * repulsion;
          a.vy -= dy * repulsion;
          b.vx += dx * repulsion;
          b.vy += dy * repulsion;
        }
      }

      activeNodes.forEach((node) => {
        node.vx *= 0.84;
        node.vy *= 0.84;
        node.x = Math.max(35, Math.min(1165, node.x + node.vx));
        node.y = Math.max(35, Math.min(725, node.y + node.vy));
      });
    }

    render();
  }

  function render() {
    projectEdges.forEach((edge) => {
      const a = nodeMap[edge.source];
      const b = nodeMap[edge.target];

      edge.el.setAttribute("x1", a.x);
      edge.el.setAttribute("y1", a.y);
      edge.el.setAttribute("x2", b.x);
      edge.el.setAttribute("y2", b.y);
    });

    peopleEdges.forEach((edge) => {
      const a = nodeMap[edge.source];
      const b = nodeMap[edge.target];

      edge.el.setAttribute("x1", a.x);
      edge.el.setAttribute("y1", a.y);
      edge.el.setAttribute("x2", b.x);
      edge.el.setAttribute("y2", b.y);

      const width = 1.2 + Math.min(4, edge.projects.length - 1);
      edge.el.setAttribute("stroke-width", String(width));
    });

    nodes.forEach((node) => {
      node.el.setAttribute(
        "transform",
        `translate(${node.x} ${node.y})`
      );
    });
  }

  function transformViewport() {
    viewport.setAttribute(
      "transform",
      `translate(${tx} ${ty}) scale(${scale})`
    );
  }

  function clearSelection() {
    nodes.forEach((node) => {
      node.el.classList.remove("dim", "selected");
    });

    projectEdges.forEach((edge) => {
      edge.el.classList.remove("dim");
    });

    peopleEdges.forEach((edge) => {
      edge.el.classList.remove("dim");
    });
  }

  function selectNode(node) {
    clearSelection();
    node.el.classList.add("selected");

    const connectedIds = new Set([node.id]);

    if (viewMode === "projects") {
      projectEdges.forEach((edge) => {
        if (edge.source === node.id) {
          connectedIds.add(edge.target);
        }

        if (edge.target === node.id) {
          connectedIds.add(edge.source);
        }
      });

      nodes.forEach((candidate) => {
        if (!connectedIds.has(candidate.id)) {
          candidate.el.classList.add("dim");
        }
      });

      projectEdges.forEach((edge) => {
        if (
          !connectedIds.has(edge.source) ||
          !connectedIds.has(edge.target)
        ) {
          edge.el.classList.add("dim");
        }
      });
    } else {
      peopleEdges.forEach((edge) => {
        if (edge.source === node.id) {
          connectedIds.add(edge.target);
        }

        if (edge.target === node.id) {
          connectedIds.add(edge.source);
        }
      });

      nodes
        .filter((candidate) => candidate.type === "person")
        .forEach((candidate) => {
          if (!connectedIds.has(candidate.id)) {
            candidate.el.classList.add("dim");
          }
        });

      peopleEdges.forEach((edge) => {
        if (
          !connectedIds.has(edge.source) ||
          !connectedIds.has(edge.target)
        ) {
          edge.el.classList.add("dim");
        }
      });
    }

    showDetails(node);
  }

  function showDetails(node) {
    if (node.type === "project") {
      details.innerHTML = `
        <div class="detail-label">
          Project P${node.id.split(":")[1]} · ${escapeHtml(node.position)}
        </div>
        <div class="detail-title">${escapeHtml(node.title)}</div>

        <div class="detail-section">
          <b>Supervisor</b><br>
          ${escapeHtml(node.supervisor)}
        </div>

        <div class="detail-section">
          <b>Collaborators</b><br>
          ${
            node.collaborators.length
              ? node.collaborators.map(escapeHtml).join("<br>")
              : "None listed"
          }
        </div>
      `;

      return;
    }

    const connectedProjects = projects.filter(
      (project) =>
        project.supervisor === node.name ||
        project.collaborators.includes(node.name)
    );

    const directPeople = new Map();

    peopleEdges.forEach((edge) => {
      if (edge.source === node.id || edge.target === node.id) {
        const otherId =
          edge.source === node.id ? edge.target : edge.source;
        directPeople.set(
          nodeMap[otherId].name,
          edge.projects.length
        );
      }
    });

    details.innerHTML = `
      <div class="detail-label">Person</div>
      <div class="detail-title">${escapeHtml(node.name)}</div>

      <div class="detail-section">
        <b>${connectedProjects.length} proposed project${
          connectedProjects.length === 1 ? "" : "s"
        }</b>
      </div>

      ${
        viewMode === "people"
          ? `
            <div class="detail-section">
              <b>${directPeople.size} direct collaborator${
                directPeople.size === 1 ? "" : "s"
              }</b><br>
              ${
                [...directPeople.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(
                    ([name, shared]) =>
                      `${escapeHtml(name)}${
                        shared > 1 ? ` (${shared} shared projects)` : ""
                      }`
                  )
                  .join("<br>") || "No direct collaborators"
              }
            </div>
          `
          : ""
      }

      ${connectedProjects
        .map(
          (project) => `
            <div class="detail-section">
              <b>P${project.id}</b> · ${
                project.supervisor === node.name
                  ? "Supervisor"
                  : "Collaborator"
              }<br>
              ${escapeHtml(project.title)}
            </div>
          `
        )
        .join("")}
    `;
  }

  function escapeHtml(value) {
    return String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[character]
    );
  }

  function updateView() {
    clearSelection();

    const projectMode = viewMode === "projects";

    projectViewButton.classList.toggle("active", projectMode);
    peopleViewButton.classList.toggle("active", !projectMode);

    document
      .querySelectorAll(".project-legend")
      .forEach((item) => item.classList.toggle("hidden", !projectMode));

    document
      .querySelectorAll(".people-legend")
      .forEach((item) => item.classList.toggle("hidden", projectMode));

    nodeGroup
      .querySelectorAll(".project-node")
      .forEach((item) => {
        item.classList.toggle("hidden-node", !projectMode);
      });

    edgeGroup.style.display = projectMode ? "" : "none";
    peopleEdgeGroup.style.display = projectMode ? "none" : "";

    filterNetwork();
    simulate(projectMode ? 180 : 260);

    details.innerHTML = projectMode
      ? `
        <h2>Projects + people</h2>
        <p>
          Project nodes connect supervisors and collaborators.
          Click any node to isolate its direct relationships.
        </p>
        <p class="hint">
          Larger person nodes participate in more proposed projects.
        </p>
      `
      : `
        <h2>Collaboration only</h2>
        <p>
          Project nodes are hidden. A line connects two people when
          they participate in the same proposed project.
        </p>
        <p class="hint">
          Thicker lines indicate that the pair shares more than one
          proposed project.
        </p>
      `;
  }

  function filterNetwork() {
    const query = search.value.toLowerCase().trim();
    const selectedPosition = position.value;

    const visibleProjects = new Set(
      projects
        .filter(
          (project) =>
            (selectedPosition === "all" ||
              project.position === selectedPosition) &&
            (
              !query ||
              project.title.toLowerCase().includes(query) ||
              project.supervisor.toLowerCase().includes(query) ||
              project.collaborators.some((person) =>
                person.toLowerCase().includes(query)
              )
            )
        )
        .map((project) => `project:${project.id}`)
    );

    const visiblePeople = new Set();

    projectEdges.forEach((edge) => {
      if (visibleProjects.has(edge.source)) {
        visiblePeople.add(edge.target);
      }
    });

    if (query) {
      people
        .filter((person) => person.toLowerCase().includes(query))
        .forEach((person) => {
          visiblePeople.add(`person:${person}`);
        });
    }

    nodes.forEach((node) => {
      if (node.type === "project") {
        node.el.classList.toggle(
          "hidden-node",
          viewMode !== "projects" || !visibleProjects.has(node.id)
        );
      } else {
        node.el.classList.toggle(
          "hidden-node",
          !visiblePeople.has(node.id)
        );
      }
    });

    projectEdges.forEach((edge) => {
      edge.el.classList.toggle(
        "hidden-edge",
        viewMode !== "projects" ||
          !visibleProjects.has(edge.source) ||
          !visiblePeople.has(edge.target)
      );
    });

    peopleEdges.forEach((edge) => {
      const sharedVisibleProject = edge.projects.some((projectId) =>
        visibleProjects.has(`project:${projectId}`)
      );

      edge.el.classList.toggle(
        "hidden-edge",
        viewMode !== "people" ||
          !visiblePeople.has(edge.source) ||
          !visiblePeople.has(edge.target) ||
          !sharedVisibleProject
      );
    });

    count.textContent =
      viewMode === "projects"
        ? `${visibleProjects.size} projects · ${visiblePeople.size} people`
        : `${visiblePeople.size} people`;
  }

  svg.addEventListener("pointermove", (event) => {
    if (!drag) {
      return;
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const transformed = point.matrixTransform(
      viewport.getScreenCTM().inverse()
    );

    drag.x = transformed.x;
    drag.y = transformed.y;
    render();
  });

  svg.addEventListener("pointerup", () => {
    drag = null;
  });

  svg.addEventListener("pointercancel", () => {
    drag = null;
  });

  svg.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();

      scale = Math.max(
        0.55,
        Math.min(2.5, scale * (event.deltaY < 0 ? 1.1 : 0.9))
      );

      transformViewport();
    },
    { passive: false }
  );

  svg.addEventListener("click", () => {
    clearSelection();
  });

  search.addEventListener("input", filterNetwork);
  position.addEventListener("change", filterNetwork);

  projectViewButton.addEventListener("click", () => {
    viewMode = "projects";
    updateView();
  });

  peopleViewButton.addEventListener("click", () => {
    viewMode = "people";
    updateView();
  });

  document.getElementById("reset").addEventListener("click", () => {
    search.value = "";
    position.value = "all";
    scale = 1;
    tx = 0;
    ty = 0;

    transformViewport();
    clearSelection();
    filterNetwork();

    details.innerHTML = `
      <h2>Explore the network</h2>
      <p>
        Click a person or project to highlight its connections.
        Drag nodes to rearrange the network and use the mouse wheel
        or trackpad to zoom.
      </p>
    `;
  });

  peopleEdgeGroup.style.display = "none";
  simulate();
  filterNetwork();
})();
