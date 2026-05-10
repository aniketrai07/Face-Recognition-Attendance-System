terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "minikube"
}

resource "kubernetes_namespace" "devops" {
  metadata {
    name = "face-attendance"
  }
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "face-attendance"
    namespace = kubernetes_namespace.devops.metadata[0].name
  }
  spec {
    replicas = 2
    selector {
      match_labels = {
        app = "face-attendance"
      }
    }
    template {
      metadata {
        labels = {
          app = "face-attendance"
        }
      }
      spec {
        container {
          name  = "face-attendance"
          image = "aniketrai07/face-attendance:v1"
          port {
            container_port = 5000
          }
          liveness_probe {
            http_get {
              path = "/health"
              port = 5000
            }
            initial_delay_seconds = 15
            period_seconds        = 10
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "app" {
  metadata {
    name      = "face-attendance-service"
    namespace = kubernetes_namespace.devops.metadata[0].name
  }
  spec {
    selector = {
      app = "face-attendance"
    }
    port {
      port        = 80
      target_port = 5000
    }
    type = "NodePort"
  }
}